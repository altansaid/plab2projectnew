package com.plabpractice.api.controller;

import com.plabpractice.api.dto.SessionParticipantDTO;
import com.plabpractice.api.model.Session;
import com.plabpractice.api.model.SessionParticipant;
import com.plabpractice.api.model.User;
import com.plabpractice.api.model.Category;
import com.plabpractice.api.model.Case;
import com.plabpractice.api.repository.SessionRepository;
import com.plabpractice.api.repository.UserRepository;
import com.plabpractice.api.repository.CategoryRepository;
import com.plabpractice.api.repository.CaseRepository;
import com.plabpractice.api.repository.SessionParticipantRepository;
import com.plabpractice.api.service.SessionService;
import com.plabpractice.api.service.SessionWebSocketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sessions")
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:3001", "http://localhost:5173" })
public class SessionController {

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CaseRepository caseRepository;

    @Autowired
    private SessionService sessionService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SessionParticipantRepository sessionParticipantRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private SessionWebSocketService webSocketService;

    @PostMapping
    public ResponseEntity<?> createSession(@RequestBody Map<String, Object> sessionData, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Extract session configuration
            String title = (String) sessionData.getOrDefault("title", "PLAB 2 Practice Session");
            String sessionType = (String) sessionData.getOrDefault("sessionType", "TOPIC");
            Integer readingTime = (Integer) sessionData.getOrDefault("readingTimeMinutes", 2);
            Integer consultationTime = (Integer) sessionData.getOrDefault("consultationTimeMinutes", 8);
            String timingType = (String) sessionData.getOrDefault("timingType", "COUNTDOWN");
            @SuppressWarnings("unchecked")
            List<String> selectedTopics = (List<String>) sessionData.getOrDefault("selectedTopics", List.of("Random"));

            Session session = sessionService.createSessionWithConfig(title, sessionType, readingTime,
                    consultationTime, timingType, selectedTopics, user);

            // Auto-leave user from other active sessions after creating new session
            List<Session> leftSessions = sessionService.leaveUserFromOtherActiveSessions(session.getCode(), user);

            // Notify other sessions about user leaving
            for (Session leftSession : leftSessions) {
                webSocketService.handleUserLeave(leftSession.getCode(), user);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("sessionCode", session.getCode());
            response.put("session", session);
            response.put("leftFromSessions", leftSessions.size()); // Optional: inform how many sessions were left

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to create session: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/create")
    public ResponseEntity<?> createSessionOld(@RequestBody CreateSessionRequest request, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Session session = sessionService.createSession(request.getTitle(), user);

            // Auto-leave user from other active sessions after creating new session
            List<Session> leftSessions = sessionService.leaveUserFromOtherActiveSessions(session.getCode(), user);

            // Notify other sessions about user leaving
            for (Session leftSession : leftSessions) {
                webSocketService.handleUserLeave(leftSession.getCode(), user);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("sessionCode", session.getCode());
            response.put("session", session);
            response.put("leftFromSessions", leftSessions.size()); // Optional: inform how many sessions were left

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to create session: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/join")
    public ResponseEntity<?> joinSessionByCode(@RequestBody Map<String, String> joinData, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String sessionCode = joinData.get("code");
            Optional<Session> sessionOpt = sessionService.findSessionByCode(sessionCode);

            if (!sessionOpt.isPresent()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Invalid session code or session is full");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            Session session = sessionOpt.get();
            List<String> availableRoles = sessionService.getAvailableRoles(session);

            // Fetch participants as DTOs to avoid lazy loading issues
            List<SessionParticipantDTO> participantDTOs = sessionService.getSessionParticipantDTOs(session.getId());

            // Check if user is already in session and get their role
            SessionParticipant.Role userRole = sessionService.getUserRoleInSession(sessionCode, user);
            boolean isHost = sessionService.isUserHost(sessionCode, user);

            Map<String, Object> response = new HashMap<>();
            response.put("sessionCode", session.getCode());
            response.put("title", session.getTitle());
            response.put("availableRoles", availableRoles);
            response.put("participants", participantDTOs);
            response.put("userRole", userRole != null ? userRole.toString() : null);
            response.put("isHost", isHost);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to join session: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/{sessionCode}/join-with-role")
    public ResponseEntity<?> joinSessionWithRole(@PathVariable String sessionCode,
            @RequestBody Map<String, String> roleData,
            Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String role = roleData.get("role");

            // Auto-leave user from other active sessions before joining this one
            List<Session> leftSessions = sessionService.leaveUserFromOtherActiveSessions(sessionCode, user);

            // Notify other sessions about user leaving
            for (Session leftSession : leftSessions) {
                webSocketService.handleUserLeave(leftSession.getCode(), user);
            }

            Session session = sessionService.joinSessionWithRole(sessionCode, role, user);

            // Start user activity tracking
            webSocketService.startUserActivityTracking(sessionCode, user.getId());

            // Broadcast participant update to all session participants
            webSocketService.broadcastParticipantUpdate(sessionCode);
            webSocketService.broadcastSessionUpdate(sessionCode);

            // Get updated user role information
            SessionParticipant.Role userRole = sessionService.getUserRoleInSession(sessionCode, user);
            boolean isHost = sessionService.isUserHost(sessionCode, user);

            // Fetch participants as DTOs to avoid lazy loading issues
            List<SessionParticipantDTO> participantDTOs = sessionService.getSessionParticipantDTOs(session.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("session", session);
            response.put("participants", participantDTOs);
            response.put("message", "Successfully joined session with role: " + role);
            response.put("userRole", userRole != null ? userRole.toString() : null);
            response.put("isHost", isHost);
            response.put("leftFromSessions", leftSessions.size()); // Optional: inform how many sessions were left

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to join session: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/{sessionCode}/configure")
    public ResponseEntity<?> configureSession(@PathVariable String sessionCode,
            @RequestBody Map<String, Object> config, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Get session first to check if it already has a case
            Session existingSession = sessionService.findSessionByCode(sessionCode)
                    .orElseThrow(() -> new RuntimeException("Session not found"));

            // Get random case based on topics if specified AND if no case is already
            // selected
            Case selectedCase = existingSession.getSelectedCase(); // Use existing case if available

            if (selectedCase == null) {
                // Only select a new case if one isn't already assigned
                String sessionType = (String) config.get("sessionType");

                if ("RECALL".equals(sessionType)) {
                    // Handle recall mode case selection
                    String recallDate = (String) config.get("recallDate");
                    if (recallDate != null && !recallDate.isEmpty()) {
                        List<Case> allRecallCases = caseRepository.findByIsRecallCaseTrue();
                        List<Case> filteredCases = allRecallCases.stream()
                                .filter(c -> c.getRecallDates() != null && c.getRecallDates().contains(recallDate))
                                .collect(Collectors.toList());
                        if (!filteredCases.isEmpty()) {
                            selectedCase = filteredCases.get((int) (Math.random() * filteredCases.size()));
                        }
                    }
                } else {
                    // Handle topic-based case selection (existing logic)
                    @SuppressWarnings("unchecked")
                    List<String> selectedTopics = (List<String>) config.get("selectedTopics");

                    if (selectedTopics != null && !selectedTopics.isEmpty()) {
                        if (selectedTopics.contains("Random")) {
                            List<Case> allCases = caseRepository.findAll();
                            if (!allCases.isEmpty()) {
                                selectedCase = allCases.get((int) (Math.random() * allCases.size()));
                            }
                        } else {
                            List<Case> topicCases = caseRepository.findByCategoryNameIn(selectedTopics);
                            if (!topicCases.isEmpty()) {
                                selectedCase = topicCases.get((int) (Math.random() * topicCases.size()));
                            }
                        }
                    }
                }
            }

            Session session = sessionService.configureSession(sessionCode, config, selectedCase, user);

            // Broadcast session update to all participants
            webSocketService.broadcastSessionUpdate(sessionCode);

            // Fetch participants as DTOs to avoid lazy loading issues
            List<SessionParticipantDTO> participantDTOs = sessionService.getSessionParticipantDTOs(session.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("session", session);
            response.put("participants", participantDTOs);
            response.put("message", "Session configured successfully");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to configure session: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/{sessionCode}/start")
    public ResponseEntity<?> startSession(@PathVariable String sessionCode, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Verify user is host
            if (!sessionService.isUserHost(sessionCode, user)) {
                throw new RuntimeException("Only the host can start the session");
            }

            // Get session and verify it exists
            Session session = sessionService.findSessionByCode(sessionCode)
                    .orElseThrow(() -> new RuntimeException("Session not found"));

            // Start the session by transitioning to reading phase
            session.setPhase(Session.Phase.READING);
            session.setStatus(Session.Status.IN_PROGRESS);
            session.setStartTime(LocalDateTime.now());
            sessionRepository.save(session);

            // Broadcast session update to all participants
            webSocketService.broadcastSessionUpdate(sessionCode);

            // Start the timer and broadcast phase change
            webSocketService.broadcastPhaseChange(sessionCode, Session.Phase.READING.toString(),
                    session.getReadingTime() * 60, System.currentTimeMillis());
            webSocketService.startTimer(sessionCode);

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to start session: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/{sessionCode}/skip-phase")
    public ResponseEntity<?> skipPhase(@PathVariable String sessionCode, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            webSocketService.skipPhase(sessionCode, user);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Phase skipped successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to skip phase: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/{sessionCode}/new-case")
    public ResponseEntity<?> requestNewCase(@PathVariable String sessionCode, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Verify user is in session and has doctor role
            SessionParticipant.Role userRole = sessionService.getUserRoleInSession(sessionCode, user);
            if (userRole != SessionParticipant.Role.DOCTOR) {
                throw new RuntimeException("Only the doctor can request a new case");
            }

            // Get session and verify it exists
            Session session = sessionService.findSessionByCode(sessionCode)
                    .orElseThrow(() -> new RuntimeException("Session not found"));

            // Get a new random case based on the current case's category
            Case currentCase = session.getSelectedCase();
            if (currentCase == null || currentCase.getCategory() == null) {
                throw new RuntimeException("No category information available");
            }

            // Get all cases in the same category
            List<Case> categoryCases = caseRepository.findByCategoryId(currentCase.getCategory().getId());
            if (categoryCases.isEmpty()) {
                throw new RuntimeException("No cases available in the current category");
            }

            // Select a random case from the category (different from the current one)
            Case newCase;
            if (categoryCases.size() > 1) {
                do {
                    newCase = categoryCases.get((int) (Math.random() * categoryCases.size()));
                } while (newCase.getId().equals(currentCase.getId()));
            } else {
                // If there's only one case in the category, use it
                newCase = categoryCases.get(0);
            }

            // Update session with new case
            session.setSelectedCase(newCase);
            session.setPhase(Session.Phase.READING);
            sessionRepository.save(session);

            // Reset session participants' completion status
            sessionService.resetParticipantStatus(sessionCode);

            // Notify all participants about the new case and phase change
            webSocketService.broadcastSessionUpdate(sessionCode);
            webSocketService.broadcastPhaseChange(sessionCode, Session.Phase.READING.toString(),
                    session.getReadingTime() * 60, System.currentTimeMillis());

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to get new case: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/{sessionCode}/complete")
    public ResponseEntity<?> completeSession(@PathVariable String sessionCode, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Optional<Session> sessionOpt = sessionService.findSessionByCode(sessionCode);
            if (!sessionOpt.isPresent()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Session not found");
                return ResponseEntity.notFound().build();
            }

            Session session = sessionOpt.get();
            boolean isHost = sessionService.isUserHost(sessionCode, user);

            // In feedback phase: everyone (including host) completes individually
            if (session.getPhase() == Session.Phase.FEEDBACK) {
                // Check if user is already completed
                if (sessionService.hasUserCompleted(sessionCode, user)) {
                    Map<String, Object> response = new HashMap<>();
                    response.put("message", "You have already completed your session");
                    response.put("alreadyCompleted", true);
                    return ResponseEntity.ok(response);
                }

                // Mark user as completed (both host and non-host)
                sessionService.markUserSessionCompleted(sessionCode, user);

                // Notify other participants via WebSocket
                webSocketService.broadcastParticipantUpdate(sessionCode);

                // Check if all users are completed to end the session
                if (sessionService.areAllUsersCompleted(sessionCode)) {
                    webSocketService.endSession(sessionCode, "All participants have completed their sessions");
                }

                Map<String, Object> response = new HashMap<>();
                response.put("message", "Your session has been completed successfully");
                response.put("completed", true);
                return ResponseEntity.ok(response);
            } else {
                // Only host can complete session outside of feedback phase
                if (!isHost) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("error",
                            "Only the session host can complete the session outside of feedback phase");
                    return ResponseEntity.badRequest().body(errorResponse);
                }

                // Host ends the entire session
                webSocketService.endSession(sessionCode, "Session completed by host");
                Map<String, Object> response = new HashMap<>();
                response.put("message", "Session completed successfully");
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to complete session: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/{sessionCode}/leave")
    public ResponseEntity<?> leaveSession(@PathVariable String sessionCode, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Stop user activity tracking
            webSocketService.stopUserActivityTracking(sessionCode, user.getId());

            webSocketService.handleUserLeave(sessionCode, user);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Successfully left session");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to leave session: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/{sessionCode}/observer-feedback-status")
    public ResponseEntity<?> getObserverFeedbackStatus(@PathVariable String sessionCode, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Session session = sessionRepository.findByCode(sessionCode)
                    .orElseThrow(() -> new RuntimeException("Session not found"));

            // Check if user is a participant in this session
            if (!sessionParticipantRepository.existsBySessionIdAndUserId(session.getId(), user.getId())) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "You are not a participant in this session");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // Check if there's an active observer in the session
            List<SessionParticipant> observers = sessionParticipantRepository
                    .findBySessionIdAndRole(session.getId(), SessionParticipant.Role.OBSERVER)
                    .stream()
                    .filter(SessionParticipant::getIsActive)
                    .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("hasObserver", !observers.isEmpty());

            if (!observers.isEmpty()) {
                // Check if any observer has given feedback for the current round
                boolean observerHasGivenFeedback = observers.stream()
                        .anyMatch(observer -> sessionService.hasUserGivenFeedbackForCurrentRound(sessionCode,
                                observer.getUser()));

                response.put("observerHasGivenFeedback", observerHasGivenFeedback);
                response.put("observerCount", observers.size());
            } else {
                response.put("observerHasGivenFeedback", true); // No observer means no blocking
                response.put("observerCount", 0);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to check observer feedback status: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/{sessionCode}")
    public ResponseEntity<?> getSessionByCode(@PathVariable String sessionCode, Authentication auth) {
        try {
            Optional<Session> sessionOpt = sessionService.findSessionByCode(sessionCode);
            if (!sessionOpt.isPresent()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Session not found");
                return ResponseEntity.notFound().build();
            }

            Session session = sessionOpt.get();

            // Update timer information to get current remaining time
            sessionService.updateSessionTimerInfo(session);

            Map<String, Object> response = new HashMap<>();

            // Fetch participants as DTOs to avoid lazy loading issues
            List<SessionParticipantDTO> participantDTOs = sessionService.getSessionParticipantDTOs(session.getId());

            // Include session data
            response.put("id", session.getId());
            response.put("title", session.getTitle());
            response.put("code", session.getCode());
            response.put("status", session.getStatus());
            response.put("phase", session.getPhase());
            response.put("readingTime", session.getReadingTime());
            response.put("consultationTime", session.getConsultationTime());
            response.put("timingType", session.getTimingType());
            response.put("sessionType", session.getSessionType());
            response.put("selectedTopics", session.getSelectedTopics());
            // Include user role information if authenticated
            SessionParticipant.Role userRole = null;
            if (auth != null) {
                User user = userRepository.findByEmail(auth.getName()).orElse(null);
                if (user != null) {
                    userRole = sessionService.getUserRoleInSession(sessionCode, user);
                    boolean isHost = sessionService.isUserHost(sessionCode, user);
                    response.put("userRole", userRole != null ? userRole.toString() : null);
                    response.put("isHost", isHost);

                    // Start/refresh user activity tracking if user is in this session
                    if (userRole != null) {
                        webSocketService.trackUserActivity(sessionCode, user.getId());
                    }
                }
            }

            // Filter selectedCase based on user role - hide case title from doctors
            Case selectedCase = session.getSelectedCase();
            if (selectedCase != null) {
                if (userRole == SessionParticipant.Role.DOCTOR) {
                    // Create a filtered version of the case for doctors without the title
                    Map<String, Object> filteredCase = new HashMap<>();
                    filteredCase.put("id", selectedCase.getId());
                    // Don't include title for doctors
                    filteredCase.put("description", selectedCase.getDescription());

                    // Create a proper category object
                    Map<String, Object> category = new HashMap<>();
                    category.put("id", selectedCase.getCategory().getId());
                    category.put("name", selectedCase.getCategory().getName());
                    filteredCase.put("category", category);

                    // Add role-specific content based on participant role
                    if (userRole == SessionParticipant.Role.DOCTOR) {
                        filteredCase.put("scenario", selectedCase.getDoctorScenario());
                        filteredCase.put("sections", selectedCase.getDoctorSections());
                    } else {
                        filteredCase.put("scenario", selectedCase.getPatientScenario());
                        filteredCase.put("sections", selectedCase.getPatientSections());
                    }
                    filteredCase.put("doctorRole", selectedCase.getDoctorRole());
                    filteredCase.put("patientRole", selectedCase.getPatientRole());
                    filteredCase.put("observerNotes", selectedCase.getObserverNotes());
                    filteredCase.put("learningObjectives", selectedCase.getLearningObjectives());
                    filteredCase.put("duration", selectedCase.getDuration());
                    filteredCase.put("doctorNotes", selectedCase.getDoctorNotes());
                    filteredCase.put("patientNotes", selectedCase.getPatientNotes());
                    filteredCase.put("imageUrl", selectedCase.getImageUrl());
                    filteredCase.put("feedbackCriteria", selectedCase.getFeedbackCriteria());
                    response.put("selectedCase", filteredCase);
                } else {
                    // For non-doctor roles, include the full case with title
                    response.put("selectedCase", selectedCase);
                }
            } else {
                response.put("selectedCase", null);
            }

            response.put("timeRemaining", session.getTimeRemaining());
            response.put("participants", participantDTOs);
            response.put("createdAt", session.getCreatedAt());
            response.put("startTime", session.getStartTime());
            response.put("endTime", session.getEndTime());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to get session: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/join/{sessionCode}")
    public ResponseEntity<?> joinSessionOld(@PathVariable String sessionCode, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Auto-leave user from other active sessions before joining this one
            List<Session> leftSessions = sessionService.leaveUserFromOtherActiveSessions(sessionCode, user);

            // Notify other sessions about user leaving
            for (Session leftSession : leftSessions) {
                webSocketService.handleUserLeave(leftSession.getCode(), user);
            }

            Optional<Session> sessionOpt = sessionService.joinSession(sessionCode, user);
            if (sessionOpt.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Session not found");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            Session session = sessionOpt.get();

            // Fetch participants as DTOs to avoid lazy loading issues
            List<SessionParticipantDTO> participantDTOs = sessionService.getSessionParticipantDTOs(session.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("session", session);
            response.put("participants", participantDTOs);
            response.put("message", "Successfully joined session");
            response.put("leftFromSessions", leftSessions.size()); // Optional: inform how many sessions were left

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to join session: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @MessageMapping("/session.message")
    public void handleSessionMessage(@Payload SessionMessage message) {
        messagingTemplate.convertAndSend(
                "/topic/session/" + message.getSessionCode() + "/messages",
                message);
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActiveSessions() {
        try {
            List<Session> activeSessions = sessionRepository.findByStatus(Session.Status.IN_PROGRESS);
            // Convert to DTOs to avoid lazy loading issues
            List<Map<String, Object>> sessionDTOs = activeSessions.stream()
                    .map(session -> {
                        Map<String, Object> sessionData = new HashMap<>();
                        sessionData.put("id", session.getId());
                        sessionData.put("title", session.getTitle());
                        sessionData.put("code", session.getCode());
                        sessionData.put("status", session.getStatus());
                        sessionData.put("phase", session.getPhase());
                        sessionData.put("createdAt", session.getCreatedAt());
                        sessionData.put("startTime", session.getStartTime());
                        // Get participant count separately
                        int participantCount = sessionService.getSessionParticipants(session.getId()).size();
                        sessionData.put("participantCount", participantCount);
                        return sessionData;
                    })
                    .toList();
            return ResponseEntity.ok(sessionDTOs);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to get active sessions: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/history")
    public ResponseEntity<?> getSessionHistory(Authentication auth) {
        try {
            // For now, return empty list
            // TODO: Implement user-specific session history
            return ResponseEntity.ok(List.of());
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch session history: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/user/active")
    public ResponseEntity<?> getUserActiveSessions(Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Get user's active sessions (CREATED or IN_PROGRESS) where the participant is
            // still active
            List<SessionParticipant> userParticipations = sessionParticipantRepository
                    .findByUserIdAndIsActive(user.getId(), true);
            List<Session> activeSessions = userParticipations.stream()
                    .map(SessionParticipant::getSession)
                    .filter(session -> session.getStatus() == Session.Status.CREATED ||
                            session.getStatus() == Session.Status.IN_PROGRESS)
                    .toList();

            // Convert to DTOs with user role information
            List<Map<String, Object>> sessionDTOs = activeSessions.stream()
                    .map(session -> {
                        Map<String, Object> sessionData = new HashMap<>();
                        sessionData.put("id", session.getId());
                        sessionData.put("title", session.getTitle());
                        sessionData.put("code", session.getCode());
                        sessionData.put("status", session.getStatus());
                        sessionData.put("phase", session.getPhase());
                        sessionData.put("createdAt", session.getCreatedAt());
                        sessionData.put("startTime", session.getStartTime());

                        // Add user's role in this session
                        SessionParticipant.Role userRole = sessionService.getUserRoleInSession(session.getCode(), user);
                        boolean isHost = sessionService.isUserHost(session.getCode(), user);
                        sessionData.put("userRole", userRole != null ? userRole.toString() : null);
                        sessionData.put("isHost", isHost);

                        // Get active participant count
                        int participantCount = sessionService.getSessionParticipants(session.getId()).size();
                        sessionData.put("participantCount", participantCount);

                        return sessionData;
                    })
                    .toList();

            return ResponseEntity.ok(sessionDTOs);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch user active sessions: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    // Feedback endpoints moved to FeedbackController

    @GetMapping("/categories")
    public ResponseEntity<?> getCategories() {
        try {
            List<Category> categories = categoryRepository.findAll();
            return ResponseEntity.ok(categories);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch categories: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/categories/{categoryId}/cases")
    public ResponseEntity<?> getCasesByCategory(@PathVariable Long categoryId) {
        try {
            List<Case> cases = caseRepository.findByCategoryId(categoryId);
            return ResponseEntity.ok(cases);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch cases: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/cases")
    public ResponseEntity<?> getAllCases() {
        try {
            List<Case> cases = caseRepository.findAll();
            return ResponseEntity.ok(cases);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch cases: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/cases/{caseId}")
    public ResponseEntity<?> getCase(@PathVariable Long caseId) {
        try {
            Case caseEntity = caseRepository.findById(caseId)
                    .orElseThrow(() -> new RuntimeException("Case not found"));
            return ResponseEntity.ok(caseEntity);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch case: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    private String generateSessionCode() {
        Random random = new Random();
        return String.format("%06d", random.nextInt(999999));
    }

    public static class CreateSessionRequest {
        private String title;

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }
    }

    public static class SessionMessage {
        private String sessionCode;
        private String content;
        private String senderName;

        public String getSessionCode() {
            return sessionCode;
        }

        public void setSessionCode(String sessionCode) {
            this.sessionCode = sessionCode;
        }

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }

        public String getSenderName() {
            return senderName;
        }

        public void setSenderName(String senderName) {
            this.senderName = senderName;
        }
    }
}