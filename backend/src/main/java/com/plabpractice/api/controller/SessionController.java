package com.plabpractice.api.controller;

import com.plabpractice.api.model.Session;
import com.plabpractice.api.model.SessionParticipant;
import com.plabpractice.api.model.User;
import com.plabpractice.api.model.Category;
import com.plabpractice.api.model.Case;
import com.plabpractice.api.repository.SessionRepository;
import com.plabpractice.api.repository.UserRepository;
import com.plabpractice.api.repository.CategoryRepository;
import com.plabpractice.api.repository.CaseRepository;
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

            Map<String, Object> response = new HashMap<>();
            response.put("sessionCode", session.getCode());
            response.put("session", session);

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

            Map<String, Object> response = new HashMap<>();
            response.put("sessionCode", session.getCode());
            response.put("session", session);

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

            // Fetch participants separately to avoid lazy loading issues
            List<SessionParticipant> participants = sessionService.getSessionParticipants(session.getId());

            // Check if user is already in session and get their role
            SessionParticipant.Role userRole = sessionService.getUserRoleInSession(sessionCode, user);
            boolean isHost = sessionService.isUserHost(sessionCode, user);

            Map<String, Object> response = new HashMap<>();
            response.put("sessionCode", session.getCode());
            response.put("title", session.getTitle());
            response.put("availableRoles", availableRoles);
            response.put("participants", participants);
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
            Session session = sessionService.joinSessionWithRole(sessionCode, role, user);

            // Broadcast participant update to all session participants
            webSocketService.broadcastParticipantUpdate(sessionCode);
            webSocketService.broadcastSessionUpdate(sessionCode);

            // Get updated user role information
            SessionParticipant.Role userRole = sessionService.getUserRoleInSession(sessionCode, user);
            boolean isHost = sessionService.isUserHost(sessionCode, user);

            // Fetch participants separately to avoid lazy loading issues
            List<SessionParticipant> participants = sessionService.getSessionParticipants(session.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("session", session);
            response.put("participants", participants);
            response.put("message", "Successfully joined session with role: " + role);
            response.put("userRole", userRole != null ? userRole.toString() : null);
            response.put("isHost", isHost);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to join session: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/{sessionCode}/configure")
    public ResponseEntity<?> configureSession(@PathVariable String sessionCode,
            @RequestBody Map<String, Object> config,
            Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Get random case based on topics if specified
            @SuppressWarnings("unchecked")
            List<String> selectedTopics = (List<String>) config.get("selectedTopics");
            Case selectedCase = null;

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

            Session session = sessionService.configureSession(sessionCode, config, selectedCase, user);

            // Broadcast session update to all participants
            webSocketService.broadcastSessionUpdate(sessionCode);

            // Fetch participants separately to avoid lazy loading issues
            List<SessionParticipant> participants = sessionService.getSessionParticipants(session.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("session", session);
            response.put("participants", participants);
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

            // Check if session can be started
            if (!webSocketService.canStartSession(sessionCode)) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error",
                        "Session cannot be started. Need at least a Doctor and one other participant.");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // Start the session by transitioning to reading phase
            webSocketService.broadcastPhaseChange(sessionCode, Session.Phase.READING);
            webSocketService.startTimer(sessionCode);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Session started successfully");
            return ResponseEntity.ok(response);
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

    @PostMapping("/{sessionCode}/leave")
    public ResponseEntity<?> leaveSession(@PathVariable String sessionCode, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

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
            Map<String, Object> response = new HashMap<>();

            // Fetch participants separately to avoid lazy loading issues
            List<SessionParticipant> participants = sessionService.getSessionParticipants(session.getId());

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
            response.put("selectedCase", session.getSelectedCase());
            response.put("timeRemaining", session.getTimeRemaining());
            response.put("participants", participants);
            response.put("createdAt", session.getCreatedAt());
            response.put("startTime", session.getStartTime());
            response.put("endTime", session.getEndTime());

            // Include user role information if authenticated
            if (auth != null) {
                User user = userRepository.findByEmail(auth.getName()).orElse(null);
                if (user != null) {
                    SessionParticipant.Role userRole = sessionService.getUserRoleInSession(sessionCode, user);
                    boolean isHost = sessionService.isUserHost(sessionCode, user);
                    response.put("userRole", userRole != null ? userRole.toString() : null);
                    response.put("isHost", isHost);
                }
            }

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

            Optional<Session> sessionOpt = sessionService.joinSession(sessionCode, user);
            if (sessionOpt.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Session not found");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            Session session = sessionOpt.get();

            // Fetch participants separately to avoid lazy loading issues
            List<SessionParticipant> participants = sessionService.getSessionParticipants(session.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("session", session);
            response.put("participants", participants);
            response.put("message", "Successfully joined session");

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