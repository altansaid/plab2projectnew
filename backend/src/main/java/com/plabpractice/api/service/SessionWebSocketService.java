package com.plabpractice.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plabpractice.api.model.Session;
import com.plabpractice.api.model.SessionParticipant;
import com.plabpractice.api.model.User;
import com.plabpractice.api.repository.SessionRepository;
import com.plabpractice.api.repository.SessionParticipantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@Service
public class SessionWebSocketService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private SessionParticipantRepository participantRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(10);
    private final Map<String, Boolean> activeTimers = new ConcurrentHashMap<>();
    private final Map<String, ScheduledFuture<?>> timerTasks = new ConcurrentHashMap<>();

    public void broadcastSessionUpdate(String sessionCode) {
        Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
        if (sessionOpt.isPresent()) {
            Session session = sessionOpt.get();
            Map<String, Object> sessionData = createSessionUpdateMessage(session);
            messagingTemplate.convertAndSend("/topic/session/" + sessionCode, sessionData);
        }
    }

    public void broadcastParticipantUpdate(String sessionCode) {
        Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
        if (sessionOpt.isPresent()) {
            Session session = sessionOpt.get();
            List<SessionParticipant> participants = participantRepository.findBySessionId(session.getId());

            // Enhanced participant data with user information
            List<Map<String, Object>> participantDetails = participants.stream().map(p -> {
                Map<String, Object> detail = new HashMap<>();
                detail.put("id", p.getId().toString());
                detail.put("userId", p.getUser().getId());
                detail.put("name", p.getUser().getName());
                detail.put("role", p.getRole().toString().toLowerCase());
                detail.put("isOnline", true); // For now, assume all are online
                return detail;
            }).toList();

            Map<String, Object> participantData = new HashMap<>();
            participantData.put("type", "PARTICIPANT_UPDATE");
            participantData.put("participants", participantDetails);
            participantData.put("sessionCode", sessionCode);

            System.out.println("Broadcasting participant update: " + participantData);
            messagingTemplate.convertAndSend("/topic/session/" + sessionCode, participantData);
        }
    }

    public void broadcastPhaseChange(String sessionCode, Session.Phase newPhase) {
        Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
        if (sessionOpt.isPresent()) {
            Session session = sessionOpt.get();
            session.setPhase(newPhase);
            session.setPhaseStartTime(LocalDateTime.now());

            // Set timer duration based on phase
            int phaseDurationSeconds = 0;
            if (newPhase == Session.Phase.READING) {
                phaseDurationSeconds = session.getReadingTime() * 60;
                session.setTimeRemaining(phaseDurationSeconds);
            } else if (newPhase == Session.Phase.CONSULTATION) {
                phaseDurationSeconds = session.getConsultationTime() * 60;
                session.setTimeRemaining(phaseDurationSeconds);
            } else if (newPhase == Session.Phase.FEEDBACK) {
                session.setTimeRemaining(0);
            }

            sessionRepository.save(session);

            // Send phase change with client-side timer data
            long startTimestamp = System.currentTimeMillis();
            Map<String, Object> phaseData = new HashMap<>();
            phaseData.put("type", "PHASE_CHANGE");
            phaseData.put("phase", newPhase);
            phaseData.put("durationSeconds", phaseDurationSeconds);
            phaseData.put("startTimestamp", startTimestamp);
            phaseData.put("sessionCode", sessionCode);
            phaseData.put("message", "Phase changed - clients will handle countdown locally");
            messagingTemplate.convertAndSend("/topic/session/" + sessionCode, phaseData);

            System.out.println("Phase changed to " + newPhase + " for session: " + sessionCode +
                    " - clients will handle " + phaseDurationSeconds + "s countdown locally");

            // Send case data to all participants when entering reading phase
            if (newPhase == Session.Phase.READING) {
                sendCaseDataToAllParticipants(sessionCode);
            }
        }
    }

    public void startTimer(String sessionCode) {
        // Stop any existing timer first to prevent conflicts
        stopTimer(sessionCode);

        Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
        if (!sessionOpt.isPresent()) {
            return;
        }
        Session session = sessionOpt.get();

        activeTimers.put(sessionCode, true);
        System.out.println("Starting client-side timer for session: " + sessionCode);

        // Calculate phase duration and set start time
        int phaseDurationSeconds = getCurrentPhaseTime(session);
        long startTimestamp = System.currentTimeMillis();

        // Set session timer metadata (save once, not every second)
        session.setTimeRemaining(phaseDurationSeconds);
        session.setPhaseStartTime(LocalDateTime.now());
        sessionRepository.save(session);

        // Send TIMER_START event ONCE with all necessary data for client-side countdown
        Map<String, Object> timerStartData = Map.of(
                "type", "TIMER_START",
                "phase", session.getPhase(),
                "durationSeconds", phaseDurationSeconds,
                "startTimestamp", startTimestamp,
                "sessionCode", sessionCode,
                "message", "Timer started - clients will handle countdown locally");
        messagingTemplate.convertAndSend("/topic/session/" + sessionCode, timerStartData);

        // Schedule SINGLE task to handle phase transition when timer expires
        // NO per-second updates, NO database writes, NO WebSocket spam
        ScheduledFuture<?> expiryTask = scheduler.schedule(() -> {
            if (activeTimers.getOrDefault(sessionCode, false)) {
                System.out.println("Timer expired for session: " + sessionCode + " - triggering phase transition");
                handlePhaseTransition(session);
            }
        }, phaseDurationSeconds, TimeUnit.SECONDS);

        // Store the expiry task (not a repeating timer)
        timerTasks.put(sessionCode, expiryTask);

        System.out.println("Client-side timer started for session: " + sessionCode +
                " - duration: " + phaseDurationSeconds + "s, no per-second updates");
    }

    public void stopTimer(String sessionCode) {
        Boolean wasActive = activeTimers.put(sessionCode, false);
        if (wasActive != null && wasActive) {
            System.out.println("Stopping timer for session: " + sessionCode);
        }

        // Cancel the scheduled timer task to prevent overlapping timers
        ScheduledFuture<?> timerTask = timerTasks.remove(sessionCode);
        if (timerTask != null && !timerTask.isCancelled()) {
            timerTask.cancel(false);
            System.out.println("Cancelled timer task for session: " + sessionCode);
        }
    }

    @Transactional
    public void handlePhaseTransition(Session session) {
        Session.Phase currentPhase = session.getPhase();
        Session.Phase nextPhase = null;

        if (currentPhase == Session.Phase.READING) {
            nextPhase = Session.Phase.CONSULTATION;
        } else if (currentPhase == Session.Phase.CONSULTATION) {
            nextPhase = Session.Phase.FEEDBACK;
        }

        if (nextPhase != null) {
            broadcastPhaseChange(session.getCode(), nextPhase);
            // Restart timer for the new phase (unless transitioning to feedback)
            if (nextPhase != Session.Phase.FEEDBACK) {
                startTimer(session.getCode());
            }
        }
    }

    public void skipPhase(String sessionCode, User user) {
        Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
        if (!sessionOpt.isPresent())
            return;
        Session session = sessionOpt.get();

        // Check if user has permission (is doctor or admin)
        Optional<SessionParticipant> participantOpt = participantRepository.findBySessionIdAndUserId(session.getId(),
                user.getId());
        if (!participantOpt.isPresent()) {
            return;
        }
        SessionParticipant participant = participantOpt.get();

        if (!participant.getRole().equals(SessionParticipant.Role.DOCTOR) && !user.getRole().equals(User.Role.ADMIN)) {
            return;
        }

        Session.Phase currentPhase = session.getPhase();
        Session.Phase nextPhase = null;

        if (currentPhase == Session.Phase.READING) {
            nextPhase = Session.Phase.CONSULTATION;
        } else if (currentPhase == Session.Phase.CONSULTATION) {
            nextPhase = Session.Phase.FEEDBACK;
        }

        if (nextPhase != null) {
            stopTimer(sessionCode);
            broadcastPhaseChange(sessionCode, nextPhase);
            // Restart timer for the new phase (unless transitioning to feedback)
            if (nextPhase != Session.Phase.FEEDBACK) {
                startTimer(sessionCode);
            }
        }
    }

    @Transactional
    public void handleUserLeave(String sessionCode, User user) {
        Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
        if (!sessionOpt.isPresent()) {
            return;
        }
        Session session = sessionOpt.get();

        // Find and remove the participant
        Optional<SessionParticipant> participantOpt = participantRepository.findBySessionIdAndUserId(session.getId(),
                user.getId());
        if (!participantOpt.isPresent()) {
            return;
        }

        SessionParticipant participant = participantOpt.get();
        participantRepository.delete(participant);

        // Broadcast user left message
        Map<String, Object> userLeftData = new HashMap<>();
        userLeftData.put("type", "USER_LEFT");
        userLeftData.put("sessionCode", sessionCode);
        userLeftData.put("userId", user.getId());
        userLeftData.put("userName", user.getName());
        userLeftData.put("userRole", participant.getRole().toString().toLowerCase());
        messagingTemplate.convertAndSend("/topic/session/" + sessionCode, userLeftData);

        // Check remaining participants
        List<SessionParticipant> remainingParticipants = participantRepository.findBySessionId(session.getId());

        // Only end session if there are insufficient participants for a meaningful
        // session
        if (remainingParticipants.size() < 2) {
            endSession(sessionCode, "Not enough participants remaining");
            return;
        }

        // Check if the leaving user was the doctor and there's no other doctor
        boolean hasDoctor = remainingParticipants.stream()
                .anyMatch(p -> p.getRole().equals(SessionParticipant.Role.DOCTOR));

        if (!hasDoctor && !session.getPhase().equals(Session.Phase.COMPLETED)) {
            endSession(sessionCode, "Doctor has left the session");
            return;
        }

        // Update participant list for remaining users
        broadcastParticipantUpdate(sessionCode);
    }

    @Transactional
    public void endSession(String sessionCode, String reason) {
        Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
        if (!sessionOpt.isPresent()) {
            return;
        }

        Session session = sessionOpt.get();

        // Stop any active timers
        stopTimer(sessionCode);

        // Update session status
        session.setPhase(Session.Phase.COMPLETED);
        session.setStatus(Session.Status.COMPLETED);
        session.setEndTime(LocalDateTime.now());
        sessionRepository.save(session);

        // Broadcast session ended message to all participants
        Map<String, Object> sessionEndedData = new HashMap<>();
        sessionEndedData.put("type", "SESSION_ENDED");
        sessionEndedData.put("sessionCode", sessionCode);
        sessionEndedData.put("reason", reason);
        sessionEndedData.put("timestamp", LocalDateTime.now());
        messagingTemplate.convertAndSend("/topic/session/" + sessionCode, sessionEndedData);

        System.out.println("Session " + sessionCode + " ended: " + reason);
    }

    public boolean canStartSession(String sessionCode) {
        Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
        if (!sessionOpt.isPresent())
            return false;

        Session session = sessionOpt.get();
        List<SessionParticipant> participants = participantRepository.findBySessionId(session.getId());

        // Need at least 1 participant (host is always DOCTOR)
        if (participants.size() < 1)
            return false;

        // Check if we have at least one participant with a valid session role
        boolean hasValidSessionRole = participants.stream()
                .anyMatch(p -> SessionParticipant.Role.DOCTOR.equals(p.getRole()) ||
                        SessionParticipant.Role.PATIENT.equals(p.getRole()) ||
                        SessionParticipant.Role.OBSERVER.equals(p.getRole()));

        return hasValidSessionRole;
    }

    public void checkSessionStartCondition(String sessionCode) {
        if (canStartSession(sessionCode)) {
            Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
            if (sessionOpt.isPresent()) {
                Session session = sessionOpt.get();
                if (session.getPhase() == Session.Phase.WAITING) {
                    broadcastPhaseChange(sessionCode, Session.Phase.READING);
                }
            }
        }
    }

    private Map<String, Object> createSessionUpdateMessage(Session session) {
        Map<String, Object> data = new HashMap<>();
        data.put("type", "SESSION_UPDATE");
        data.put("sessionCode", session.getCode());
        data.put("title", session.getTitle());
        data.put("phase", session.getPhase());
        data.put("status", session.getStatus());
        data.put("timeRemaining", session.getTimeRemaining());
        data.put("totalTime", getCurrentPhaseTime(session));

        Map<String, Object> config = new HashMap<>();
        config.put("readingTime", session.getReadingTime());
        config.put("consultationTime", session.getConsultationTime());
        config.put("timingType", session.getTimingType());
        config.put("sessionType", session.getSessionType());
        config.put("selectedTopics", session.getSelectedTopics());
        data.put("config", config);

        List<SessionParticipant> participants = participantRepository.findBySessionId(session.getId());
        data.put("participants", participants);

        // Include case data if available
        if (session.getSelectedCase() != null) {
            data.put("selectedCase", session.getSelectedCase());
        }

        return data;
    }

    private int getCurrentPhaseTime(Session session) {
        switch (session.getPhase()) {
            case READING:
                return session.getReadingTime() * 60;
            case CONSULTATION:
                return session.getConsultationTime() * 60;
            default:
                return 0;
        }
    }

    public void sendMessageToUser(String sessionCode, String userId, Object message) {
        messagingTemplate.convertAndSendToUser(userId, "/queue/session/" + sessionCode, message);
    }

    public void sendCaseDataToAllParticipants(String sessionCode) {
        Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
        if (!sessionOpt.isPresent())
            return;
        Session session = sessionOpt.get();
        if (session.getSelectedCase() == null)
            return;

        List<SessionParticipant> participants = participantRepository.findBySessionId(session.getId());

        // Send case data to all participants (Doctor, Patient, Observer)
        for (SessionParticipant participant : participants) {
            if (participant.getRole().equals(SessionParticipant.Role.DOCTOR) ||
                    participant.getRole().equals(SessionParticipant.Role.PATIENT) ||
                    participant.getRole().equals(SessionParticipant.Role.OBSERVER)) {

                Map<String, Object> caseData = Map.of(
                        "type", "CASE_DATA",
                        "case", session.getSelectedCase());
                sendMessageToUser(sessionCode, participant.getUser().getId().toString(), caseData);
            }
        }
    }

    // Keep the old method for backward compatibility, but make it call the new
    // method
    public void sendCaseDataToDoctor(String sessionCode) {
        sendCaseDataToAllParticipants(sessionCode);
    }
}