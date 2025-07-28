package com.plabpractice.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plabpractice.api.model.Case;
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
import jakarta.annotation.PreDestroy;

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

    @Autowired
    private SessionService sessionService;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(10);
    private final Map<String, Boolean> activeTimers = new ConcurrentHashMap<>();
    private final Map<String, ScheduledFuture<?>> timerTasks = new ConcurrentHashMap<>();

    // User disconnect tracking - sessionCode_userId -> last activity timestamp
    private final Map<String, Long> userLastActivity = new ConcurrentHashMap<>();
    // User disconnect timeout tasks - sessionCode_userId -> timeout task
    private final Map<String, ScheduledFuture<?>> disconnectTimeouts = new ConcurrentHashMap<>();

    private static final int DISCONNECT_TIMEOUT_MINUTES = 5;

    public void broadcastSessionUpdate(String sessionCode) {
        Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
        if (sessionOpt.isPresent()) {
            Session session = sessionOpt.get();
            Map<String, Object> sessionData = createSessionUpdateMessage(session);
            messagingTemplate.convertAndSend("/topic/session/" + sessionCode, sessionData);
        }
    }

    public void broadcastRoleChange(String sessionCode, String message) {
        Map<String, Object> roleChangeData = new HashMap<>();
        roleChangeData.put("type", "ROLE_CHANGE");
        roleChangeData.put("message", message);
        roleChangeData.put("sessionCode", sessionCode);

        messagingTemplate.convertAndSend("/topic/session/" + sessionCode, roleChangeData);

        // Also broadcast the session update to reflect the new roles
        broadcastSessionUpdate(sessionCode);
    }

    public void broadcastTopicSelectionNeeded(String sessionCode, String completedTopic, List<String> availableTopics) {
        Map<String, Object> topicSelectionData = new HashMap<>();
        topicSelectionData.put("type", "TOPIC_SELECTION_NEEDED");
        topicSelectionData.put("sessionCode", sessionCode);
        topicSelectionData.put("completedTopic", completedTopic);
        topicSelectionData.put("availableTopics", availableTopics);
        topicSelectionData.put("message", "🎉 Congratulations! All cases in " + completedTopic
                + " have been completed. Choose a new topic to continue:");

        messagingTemplate.convertAndSend("/topic/session/" + sessionCode, topicSelectionData);
    }

    public void broadcastParticipantUpdate(String sessionCode) {
        Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
        if (sessionOpt.isPresent()) {
            Session session = sessionOpt.get();
            // Only get ACTIVE participants with user data eagerly loaded
            List<SessionParticipant> activeParticipants = participantRepository
                    .findBySessionIdAndIsActiveWithUser(session.getId(), true);

            System.out.println("🔍 Broadcasting participant update for session " + sessionCode);
            System.out.println("   Found " + activeParticipants.size() + " active participants");

            // Enhanced participant data with user information
            List<Map<String, Object>> participantDetails = activeParticipants.stream()
                    .filter(p -> p.getUser() != null) // Filter out participants with null user
                    .map(p -> {
                        Map<String, Object> detail = new HashMap<>();
                        detail.put("id", p.getUser().getId().toString()); // Use userId as id for frontend compatibility
                        detail.put("userId", p.getUser().getId());
                        detail.put("name", p.getUser().getName());
                        detail.put("role", p.getRole().toString().toLowerCase());
                        detail.put("isOnline", true); // For now, assume all are online
                        detail.put("hasCompleted", p.getHasCompleted());
                        detail.put("hasGivenFeedback", p.getHasGivenFeedback());

                        System.out.println("   Participant: " + p.getUser().getName() + " (" + p.getRole()
                                + ") - User ID: " + p.getUser().getId());

                        return detail;
                    }).toList();

            System.out.println("   Sending " + participantDetails.size() + " participant details");

            Map<String, Object> participantData = new HashMap<>();
            participantData.put("type", "PARTICIPANT_UPDATE");
            participantData.put("participants", participantDetails);
            participantData.put("sessionCode", sessionCode);

            messagingTemplate.convertAndSend("/topic/session/" + sessionCode, participantData);
        }
    }

    public void broadcastPhaseChange(String sessionCode, String phase, int durationSeconds, long startTimestamp) {
        Map<String, Object> message = new HashMap<>();
        message.put("type", "PHASE_CHANGE");
        message.put("phase", phase);
        message.put("durationSeconds", durationSeconds);
        message.put("startTimestamp", startTimestamp);

        // Get the session to include the configured times
        Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
        if (sessionOpt.isPresent()) {
            Session session = sessionOpt.get();
            if (phase.equalsIgnoreCase("CONSULTATION")) {
                message.put("durationSeconds", session.getConsultationTime() * 60);
            } else if (phase.equalsIgnoreCase("READING")) {
                message.put("durationSeconds", session.getReadingTime() * 60);
            }
        }

        messagingTemplate.convertAndSend("/topic/session/" + sessionCode, message);
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

        // Calculate phase duration and set start time
        int phaseDurationSeconds = getCurrentPhaseTime(session);
        long startTimestamp = System.currentTimeMillis();

        // Set session timer metadata (save once, not every second)
        session.setTimeRemaining(phaseDurationSeconds);
        session.setPhaseStartTime(LocalDateTime.now());
        session.setTimerStartTimestamp(startTimestamp); // Store the shared timestamp
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
        ScheduledFuture<?> expiryTask = scheduler.schedule(() -> {
            if (activeTimers.getOrDefault(sessionCode, false)) {
                // Reload session to get current state
                Optional<Session> currentSessionOpt = sessionRepository.findByCode(sessionCode);
                if (currentSessionOpt.isPresent()) {
                    Session currentSession = currentSessionOpt.get();

                    // Only proceed if the session is still in the same phase
                    if (currentSession.getPhase() == session.getPhase()) {
                        handlePhaseTransition(currentSession);
                    }
                }
            }
        }, phaseDurationSeconds, TimeUnit.SECONDS);

        // Store the expiry task (not a repeating timer)
        timerTasks.put(sessionCode, expiryTask);
    }

    public void stopTimer(String sessionCode) {
        activeTimers.put(sessionCode, false);

        // Clear the stored timer start timestamp to prevent stale data
        Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
        if (sessionOpt.isPresent()) {
            Session session = sessionOpt.get();
            session.setTimerStartTimestamp(null);
            sessionRepository.save(session);
        }

        // Cancel the scheduled timer task to prevent overlapping timers
        ScheduledFuture<?> timerTask = timerTasks.remove(sessionCode);
        if (timerTask != null && !timerTask.isCancelled()) {
            timerTask.cancel(false);
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
        } else if (currentPhase == Session.Phase.FEEDBACK) {
            // Feedback phase completed - end the session
            endSession(session.getCode(), "Session completed successfully");
            return;
        }

        if (nextPhase != null) {
            // Update session phase
            session.setPhase(nextPhase);
            session = sessionRepository.save(session);

            // Broadcast phase change with appropriate duration
            int phaseDuration = getCurrentPhaseTime(session);
            long startTimestamp = System.currentTimeMillis();

            broadcastPhaseChange(session.getCode(), nextPhase.toString(), phaseDuration, startTimestamp);

            // Start timer for the new phase (unless transitioning to feedback)
            if (nextPhase != Session.Phase.FEEDBACK) {
                startTimer(session.getCode());
            } else {
                // Start a timer for feedback phase (e.g., 10 minutes max for feedback)
                scheduleFeedbackTimeout(session.getCode(), 10 * 60); // 10 minutes
            }
        }
    }

    private void scheduleFeedbackTimeout(String sessionCode, int timeoutSeconds) {
        // Schedule automatic session completion after feedback timeout
        ScheduledFuture<?> feedbackTask = scheduler.schedule(() -> {
            Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
            if (sessionOpt.isPresent()) {
                Session session = sessionOpt.get();
                if (session.getPhase() == Session.Phase.FEEDBACK &&
                        session.getStatus() != Session.Status.COMPLETED) {
                    endSession(sessionCode, "Feedback phase timeout - session auto-completed");
                }
            }
        }, timeoutSeconds, TimeUnit.SECONDS);

        // Store the task for potential cancellation
        timerTasks.put(sessionCode + "_feedback", feedbackTask);
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
            // Update the session phase before broadcasting
            session.setPhase(nextPhase);
            session = sessionRepository.save(session);

            // Get the correct duration for the next phase
            int phaseDuration = getCurrentPhaseTime(session);
            long startTimestamp = System.currentTimeMillis();

            broadcastPhaseChange(sessionCode, nextPhase.toString(), phaseDuration, startTimestamp);

            // Start timer for the new phase (unless transitioning to feedback)
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

        // Mark participant as inactive instead of deleting
        participant.setIsActive(false);
        participantRepository.save(participant);

        // Broadcast user left message
        Map<String, Object> userLeftData = new HashMap<>();
        userLeftData.put("type", "USER_LEFT");
        userLeftData.put("sessionCode", sessionCode);
        userLeftData.put("userId", user.getId());
        userLeftData.put("userName", user.getName());
        userLeftData.put("userRole", participant.getRole().toString().toLowerCase());
        messagingTemplate.convertAndSend("/topic/session/" + sessionCode, userLeftData);

        // Check remaining ACTIVE participants only
        List<SessionParticipant> remainingParticipants = participantRepository
                .findBySessionIdAndIsActive(session.getId(), true);

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
                    broadcastPhaseChange(sessionCode, session.getPhase().toString(), getCurrentPhaseTime(session),
                            System.currentTimeMillis());
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
        data.put("timerStartTimestamp", session.getTimerStartTimestamp()); // Include shared timestamp
        data.put("currentRound", session.getCurrentRound()); // Include current round for feedback state management

        Map<String, Object> config = new HashMap<>();
        config.put("readingTime", session.getReadingTime());
        config.put("consultationTime", session.getConsultationTime());
        config.put("timingType", session.getTimingType());
        config.put("sessionType", session.getSessionType());
        config.put("selectedTopics", session.getSelectedTopics());
        data.put("config", config);

        // Get only ACTIVE participants and format them properly
        List<SessionParticipant> activeParticipants = participantRepository.findBySessionIdAndIsActiveWithUser(
                session.getId(),
                true);

        // Enhanced participant data with user information - same format as
        // broadcastParticipantUpdate
        List<Map<String, Object>> participantDetails = activeParticipants.stream()
                .filter(p -> p.getUser() != null) // Filter out participants with null user
                .map(p -> {
                    Map<String, Object> detail = new HashMap<>();
                    detail.put("id", p.getUser().getId().toString()); // Use userId as id for frontend compatibility
                    detail.put("userId", p.getUser().getId());
                    detail.put("name", p.getUser().getName());
                    detail.put("role", p.getRole().toString().toLowerCase());
                    detail.put("isOnline", true); // For now, assume all are online
                    detail.put("hasCompleted", p.getHasCompleted());
                    detail.put("hasGivenFeedback", p.getHasGivenFeedback());

                    System.out.println("   📋 Session Update - Participant: " + p.getUser().getName() + " ("
                            + p.getRole() + ") - User ID: " + p.getUser().getId());

                    return detail;
                }).toList();

        System.out.println("📡 Session Update for " + session.getCode() + " - sending " + participantDetails.size()
                + " participants");

        data.put("participants", participantDetails);

        // Include case data if available - title will be filtered on frontend based on
        // role
        if (session.getSelectedCase() != null) {
            data.put("selectedCase", session.getSelectedCase());
        }

        return data;
    }

    private int getCurrentPhaseTime(Session session) {
        if (session.getPhase() == Session.Phase.READING) {
            return session.getReadingTime() * 60;
        } else if (session.getPhase() == Session.Phase.CONSULTATION) {
            return session.getConsultationTime() * 60;
        }
        return 0;
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

                Object caseToSend;
                if (participant.getRole().equals(SessionParticipant.Role.DOCTOR)) {
                    // Filter case for doctors - remove title
                    Map<String, Object> filteredCase = new HashMap<>();
                    Case fullCase = session.getSelectedCase();
                    filteredCase.put("id", fullCase.getId());
                    // Don't include title for doctors
                    filteredCase.put("description", fullCase.getDescription());
                    // Add role-specific content based on participant role
                    if (participant.getRole().equals("DOCTOR")) {
                        filteredCase.put("sections", fullCase.getDoctorSections());
                    } else {
                        filteredCase.put("sections", fullCase.getPatientSections());
                    }
                    filteredCase.put("doctorNotes", fullCase.getDoctorNotes());
                    filteredCase.put("patientNotes", fullCase.getPatientNotes());
                    filteredCase.put("imageUrl", fullCase.getImageUrl());
                    filteredCase.put("feedbackCriteria", fullCase.getFeedbackCriteria());
                    caseToSend = filteredCase;
                } else {
                    // For non-doctor roles, send full case
                    caseToSend = session.getSelectedCase();
                }

                Map<String, Object> caseData = Map.of(
                        "type", "CASE_DATA",
                        "case", caseToSend);
                sendMessageToUser(sessionCode, participant.getUser().getId().toString(), caseData);
            }
        }
    }

    // Keep the old method for backward compatibility, but make it call the new
    // method
    public void sendCaseDataToDoctor(String sessionCode) {
        sendCaseDataToAllParticipants(sessionCode);
    }

    // User Activity Tracking Methods
    public void trackUserActivity(String sessionCode, Long userId) {
        String userKey = sessionCode + "_" + userId;
        userLastActivity.put(userKey, System.currentTimeMillis());

        // Cancel existing disconnect timeout for this user
        ScheduledFuture<?> existingTimeout = disconnectTimeouts.remove(userKey);
        if (existingTimeout != null && !existingTimeout.isCancelled()) {
            existingTimeout.cancel(false);
        }

        // Schedule new disconnect timeout
        ScheduledFuture<?> timeoutTask = scheduler.schedule(() -> {
            handleUserDisconnectTimeout(sessionCode, userId);
        }, DISCONNECT_TIMEOUT_MINUTES, TimeUnit.MINUTES);

        disconnectTimeouts.put(userKey, timeoutTask);
    }

    public void handleUserDisconnectTimeout(String sessionCode, Long userId) {
        String userKey = sessionCode + "_" + userId;

        // Remove user from tracking
        userLastActivity.remove(userKey);
        disconnectTimeouts.remove(userKey);

        // Find and remove user from session
        Optional<Session> sessionOpt = sessionRepository.findByCode(sessionCode);
        if (sessionOpt.isPresent()) {
            Session session = sessionOpt.get();

            // Skip if session is already completed
            if (session.getStatus() == Session.Status.COMPLETED) {
                return;
            }

            Optional<SessionParticipant> participantOpt = participantRepository
                    .findBySessionIdAndUserId(session.getId(), userId);

            if (participantOpt.isPresent()) {
                SessionParticipant participant = participantOpt.get();
                // Use existing handleUserLeave logic
                handleUserLeave(sessionCode, participant.getUser());
            }
        }
    }

    public void startUserActivityTracking(String sessionCode, Long userId) {
        trackUserActivity(sessionCode, userId);
    }

    public void stopUserActivityTracking(String sessionCode, Long userId) {
        String userKey = sessionCode + "_" + userId;

        // Remove from tracking
        userLastActivity.remove(userKey);

        // Cancel timeout task
        ScheduledFuture<?> timeoutTask = disconnectTimeouts.remove(userKey);
        if (timeoutTask != null && !timeoutTask.isCancelled()) {
            timeoutTask.cancel(false);
        }
    }

    @PreDestroy
    public void cleanup() {

        // Cancel all active timer tasks
        timerTasks.values().forEach(task -> {
            if (task != null && !task.isCancelled()) {
                task.cancel(false);
            }
        });

        // Cancel all disconnect timeout tasks
        disconnectTimeouts.values().forEach(task -> {
            if (task != null && !task.isCancelled()) {
                task.cancel(false);
            }
        });

        // Clear all maps
        activeTimers.clear();
        timerTasks.clear();
        userLastActivity.clear();
        disconnectTimeouts.clear();

        // Shutdown scheduler gracefully
        scheduler.shutdown();
        try {
            if (!scheduler.awaitTermination(10, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
                if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                    System.err.println("SessionWebSocketService scheduler did not terminate");
                }
            }
        } catch (InterruptedException ie) {
            scheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}