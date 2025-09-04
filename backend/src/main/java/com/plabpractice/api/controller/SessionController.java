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
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

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

    @Autowired
    private ObjectMapper objectMapper;

    @PostMapping
    public ResponseEntity<?> createSession(@RequestBody Map<String, Object> sessionData, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Extract session configuration
            String title = (String) sessionData.getOrDefault("title", "PLAB 2 Practice Session");
            String sessionType = (String) sessionData.getOrDefault("sessionType", "TOPIC");
            Object readingTimeObj = sessionData.getOrDefault("readingTimeMinutes", 2);
            Object consultationTimeObj = sessionData.getOrDefault("consultationTimeMinutes", 8);

            int readingTime = (readingTimeObj instanceof Number)
                    ? (int) Math.round(((Number) readingTimeObj).doubleValue())
                    : 2;
            int consultationTime = (consultationTimeObj instanceof Number)
                    ? (int) Math.round(((Number) consultationTimeObj).doubleValue())
                    : 8;
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

            // Convert DTOs to the same flat structure used in WebSocket updates for
            // consistency
            List<Map<String, Object>> participantDetails = participantDTOs.stream()
                    .filter(dto -> dto.getUser() != null) // Filter out participants with null user
                    .map(dto -> {
                        Map<String, Object> detail = new HashMap<>();
                        detail.put("id", dto.getUser().getId().toString()); // Use userId as id for frontend
                                                                            // compatibility
                        detail.put("userId", dto.getUser().getId());
                        detail.put("name", dto.getUser().getName());
                        detail.put("role", dto.getRole().toString().toLowerCase());
                        detail.put("isOnline", true); // For now, assume all are online
                        detail.put("hasCompleted", false); // Default values for initial load
                        detail.put("hasGivenFeedback", false);
                        return detail;
                    }).toList();

            // Check if user is already in session and get their role
            SessionParticipant.Role userRole = sessionService.getUserRoleInSession(sessionCode, user);
            boolean isHost = sessionService.isUserHost(sessionCode, user);

            Map<String, Object> response = new HashMap<>();
            response.put("sessionCode", session.getCode());
            response.put("title", session.getTitle());
            response.put("availableRoles", availableRoles);
            response.put("participants", participantDetails);
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

            // Convert DTOs to the same flat structure used in WebSocket updates for
            // consistency
            List<Map<String, Object>> participantDetails = participantDTOs.stream()
                    .filter(dto -> dto.getUser() != null) // Filter out participants with null user
                    .map(dto -> {
                        Map<String, Object> detail = new HashMap<>();
                        detail.put("id", dto.getUser().getId().toString()); // Use userId as id for frontend
                                                                            // compatibility
                        detail.put("userId", dto.getUser().getId());
                        detail.put("name", dto.getUser().getName());
                        detail.put("role", dto.getRole().toString().toLowerCase());
                        detail.put("isOnline", true); // For now, assume all are online
                        detail.put("hasCompleted", false); // Default values for initial load
                        detail.put("hasGivenFeedback", false);
                        return detail;
                    }).toList();

            Map<String, Object> response = new HashMap<>();
            response.put("session", session);
            response.put("participants", participantDetails);
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
                    // Handle recall mode case selection - now supports both single date and date
                    // range
                    String recallDate = (String) config.get("recallDate");
                    String recallStartDate = (String) config.get("recallStartDate");
                    String recallEndDate = (String) config.get("recallEndDate");

                    List<Case> allRecallCases = caseRepository.findByIsRecallCaseTrue();

                    List<Case> filteredCases = new ArrayList<>();

                    if (recallStartDate != null && recallEndDate != null) {
                        // Date range mode

                        filteredCases = allRecallCases.stream()
                                .filter(c -> {
                                    if (c.getRecallDates() == null) {
                                        return false;
                                    }

                                    boolean hasDateInRange = c.getRecallDates().stream()
                                            .anyMatch(date -> date.compareTo(recallStartDate) >= 0 &&
                                                    date.compareTo(recallEndDate) <= 0);

                                    return hasDateInRange;
                                })
                                .filter(c -> {
                                    boolean notUsed = existingSession.getUsedCaseIds() == null ||
                                            !existingSession.getUsedCaseIds().contains(c.getId());
                                    return notUsed;
                                })
                                .collect(Collectors.toList());
                    } else if (recallDate != null && !recallDate.isEmpty()) {
                        // Single date mode (backward compatibility)
                        System.out.println("🔍 Using single date mode: " + recallDate);
                        filteredCases = allRecallCases.stream()
                                .filter(c -> c.getRecallDates() != null && c.getRecallDates().contains(recallDate))
                                .filter(c -> existingSession.getUsedCaseIds() == null ||
                                        !existingSession.getUsedCaseIds().contains(c.getId()))
                                .collect(Collectors.toList());
                    }

                    System.out.println("✅ Filtered cases count: " + filteredCases.size());

                    if (!filteredCases.isEmpty()) {
                        selectedCase = filteredCases.get((int) (Math.random() * filteredCases.size()));
                        System.out.println(
                                "🎯 Selected case: " + selectedCase.getId() + " (" + selectedCase.getTitle() + ")");
                    } else {
                        System.out.println("❌ No cases available for the selected criteria");
                    }
                } else {
                    // Handle topic-based case selection with used case filtering
                    @SuppressWarnings("unchecked")
                    List<String> selectedTopics = (List<String>) config.get("selectedTopics");

                    if (selectedTopics != null && !selectedTopics.isEmpty()) {
                        List<Case> allTopicCases;

                        if (selectedTopics.contains("Random")) {
                            allTopicCases = caseRepository.findAll();
                        } else {
                            allTopicCases = caseRepository.findByCategoryNameIn(selectedTopics);
                        }

                        // Filter out cases that have already been used (same logic as new case)
                        List<Long> usedIds = existingSession.getUsedCaseIds() != null
                                ? existingSession.getUsedCaseIds()
                                : new ArrayList<>();

                        List<Case> availableCases = allTopicCases.stream()
                                .filter(c -> !usedIds.contains(c.getId()))
                                .collect(Collectors.toList());

                        System.out.println("🔍 Initial case selection for topic-based session:");
                        System.out.println("   Total cases for topics " + selectedTopics + ": " + allTopicCases.size());
                        System.out.println("   Used case IDs to exclude: " + usedIds);
                        System.out.println("   Available cases after filtering: " + availableCases.size());

                        if (!availableCases.isEmpty()) {
                            selectedCase = availableCases.get((int) (Math.random() * availableCases.size()));
                            System.out.println("🎯 Selected initial case: " + selectedCase.getId() + " ("
                                    + selectedCase.getTitle() + ")");
                        } else if (!allTopicCases.isEmpty()) {
                            // If all cases for these topics have been used, reset and use any case
                            System.out.println(
                                    "🔄 All cases for selected topics used, resetting and selecting random case");
                            selectedCase = allTopicCases.get((int) (Math.random() * allTopicCases.size()));
                            System.out.println("🔄 Reset scenario - selected: " + selectedCase.getId() + " ("
                                    + selectedCase.getTitle() + ")");
                        }
                    }
                }
            }

            Session session = sessionService.configureSession(sessionCode, config, selectedCase, user);

            // Broadcast session update to all participants
            webSocketService.broadcastSessionUpdate(sessionCode);

            // Fetch participants as DTOs to avoid lazy loading issues
            List<SessionParticipantDTO> participantDTOs = sessionService.getSessionParticipantDTOs(session.getId());

            // Convert DTOs to the same flat structure used in WebSocket updates for
            // consistency
            List<Map<String, Object>> participantDetails = participantDTOs.stream()
                    .filter(dto -> dto.getUser() != null) // Filter out participants with null user
                    .map(dto -> {
                        Map<String, Object> detail = new HashMap<>();
                        detail.put("id", dto.getUser().getId().toString()); // Use userId as id for frontend
                                                                            // compatibility
                        detail.put("userId", dto.getUser().getId());
                        detail.put("name", dto.getUser().getName());
                        detail.put("role", dto.getRole().toString().toLowerCase());
                        detail.put("isOnline", true); // For now, assume all are online
                        detail.put("hasCompleted", false); // Default values for initial load
                        detail.put("hasGivenFeedback", false);
                        return detail;
                    }).toList();

            Map<String, Object> response = new HashMap<>();
            response.put("session", session);
            response.put("participants", participantDetails);
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

            // Get a new random case based on session type and exclusions
            Case currentCase = session.getSelectedCase();
            Case newCase = null;

            System.out.println("🔄 Requesting new case for session " + sessionCode);
            System.out.println("   Current case: "
                    + (currentCase != null ? currentCase.getId() + " (" + currentCase.getTitle() + ")" : "none"));
            System.out.println("   Used cases: " + session.getUsedCaseIds());
            System.out.println("   Session type: " + session.getSessionType());

            // CRITICAL: Ensure usedCaseIds is initialized and current case is marked as
            // used
            if (session.getUsedCaseIds() == null) {
                session.setUsedCaseIds(new ArrayList<>());
            }

            // IMPORTANT: Mark the current case as used BEFORE selecting a new case
            if (currentCase != null) {
                if (!session.getUsedCaseIds().contains(currentCase.getId())) {
                    session.getUsedCaseIds().add(currentCase.getId());
                    System.out.println("🔒 Marked current case " + currentCase.getId() + " (" + currentCase.getTitle()
                            + ") as used");
                    // Save immediately to ensure persistence
                    sessionRepository.save(session);
                    System.out.println("💾 Session saved. Used cases: " + session.getUsedCaseIds());
                } else {
                    System.out.println("ℹ️ Current case " + currentCase.getId() + " (" + currentCase.getTitle()
                            + ") already marked as used");
                }
            }

            if (session.getSessionType() == Session.SessionType.RECALL) {
                // For recall sessions, select from recall cases within date range
                if (session.getRecallStartDate() != null && session.getRecallEndDate() != null) {
                    // Date range mode
                    List<Case> allRecallCases = caseRepository.findByIsRecallCaseTrue();
                    List<Case> availableCases = allRecallCases.stream()
                            .filter(c -> c.getRecallDates() != null &&
                                    c.getRecallDates().stream().anyMatch(
                                            date -> date.compareTo(session.getRecallStartDate().toString()) >= 0 &&
                                                    date.compareTo(session.getRecallEndDate().toString()) <= 0))
                            .filter(c -> session.getUsedCaseIds() == null ||
                                    !session.getUsedCaseIds().contains(c.getId()))
                            .collect(Collectors.toList());

                    if (!availableCases.isEmpty()) {
                        newCase = availableCases.get((int) (Math.random() * availableCases.size()));
                    }
                } else {
                    // Single date mode (if somehow still using old format)
                    throw new RuntimeException("Recall session missing date range information");
                }
            } else {
                // For topic-based sessions, select from same category but exclude used cases
                if (currentCase == null || currentCase.getCategory() == null) {
                    throw new RuntimeException("No category information available");
                }

                // Get all cases in the same category excluding used ones
                List<Case> categoryCases = caseRepository.findByCategoryId(currentCase.getCategory().getId());
                System.out.println("📋 Total cases in category " + currentCase.getCategory().getId() + ": "
                        + categoryCases.size());
                System.out.println("📋 Used cases to exclude: " + session.getUsedCaseIds());

                // Filter out cases that have already been used (BULLETPROOF LOGIC)
                List<Long> usedIds = session.getUsedCaseIds() != null ? session.getUsedCaseIds() : new ArrayList<>();
                List<Case> availableCases = categoryCases.stream()
                        .filter(c -> !usedIds.contains(c.getId()))
                        .collect(Collectors.toList());

                System.out.println("🔍 Filtering logic:");
                System.out.println("   Used case IDs to exclude: " + usedIds);
                categoryCases.forEach(c -> {
                    boolean isUsed = usedIds.contains(c.getId());
                    System.out.println("   Case " + c.getId() + " (" + c.getTitle() + "): " +
                            (isUsed ? "❌ EXCLUDED (used)" : "✅ AVAILABLE"));
                });

                System.out.println("✅ Available cases after filtering: " + availableCases.size());
                availableCases
                        .forEach(c -> System.out.println("   - Case ID: " + c.getId() + ", Title: " + c.getTitle()));

                if (!availableCases.isEmpty()) {
                    newCase = availableCases.get((int) (Math.random() * availableCases.size()));
                    System.out.println("🎯 Selected new case: " + newCase.getId() + " (" + newCase.getTitle() + ")");
                } else {
                    // No more cases available in this category - offer new topic selection
                    System.out.println("❌ No more cases available in category " + currentCase.getCategory().getName());

                    // Get available topics (excluding current one)
                    List<String> availableTopics = getAvailableTopics(session, currentCase.getCategory().getName());

                    if (!availableTopics.isEmpty()) {
                        // Offer topic selection
                        Map<String, Object> response = new HashMap<>();
                        response.put("noMoreCases", true);
                        response.put("currentTopic", currentCase.getCategory().getName());
                        response.put("availableTopics", availableTopics);
                        response.put("message", "🎉 Congratulations! You have completed all cases in " +
                                currentCase.getCategory().getName() + ". Choose a new topic to continue:");

                        // Notify all participants about topic selection needed
                        webSocketService.broadcastTopicSelectionNeeded(sessionCode, currentCase.getCategory().getName(),
                                availableTopics);

                        return ResponseEntity.ok(response);
                    } else {
                        // No more topics available - end session
                        System.out.println("🎊 All topics completed - ending session");
                        session.setStatus(Session.Status.COMPLETED);
                        session.setPhase(Session.Phase.COMPLETED);
                        session.setEndTime(LocalDateTime.now());
                        sessionRepository.save(session);

                        // Notify all participants that session is complete
                        webSocketService.endSession(sessionCode,
                                "🎊 Congratulations! You have completed all available cases in this session.");

                        Map<String, Object> response = new HashMap<>();
                        response.put("sessionCompleted", true);
                        response.put("message",
                                "🎊 Congratulations! You have completed all available cases in this session.");
                        return ResponseEntity.ok(response);
                    }
                }
            }

            if (newCase == null) {
                // Handle the case when no more cases are available
                if (session.getSessionType() == Session.SessionType.RECALL) {
                    // For recall sessions, end the session when no more cases are available
                    System.out.println("🎊 All recall cases completed in date range - ending session");
                    session.setStatus(Session.Status.COMPLETED);
                    session.setPhase(Session.Phase.COMPLETED);
                    session.setEndTime(LocalDateTime.now());
                    sessionRepository.save(session);

                    // Notify all participants that session is complete
                    webSocketService.endSession(sessionCode,
                            "🎊 Congratulations! You have completed all available cases in the selected recall date range.");

                    Map<String, Object> response = new HashMap<>();
                    response.put("sessionCompleted", true);
                    response.put("message",
                            "🎊 Congratulations! You have completed all available cases in the selected recall date range.");
                    return ResponseEntity.ok(response);
                } else {
                    // For topic-based sessions, return error (should not reach here due to topic
                    // selection logic above)
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("error", "No available cases found");
                    return ResponseEntity.badRequest().body(errorResponse);
                }
            }

            // Update session with new case
            session.setSelectedCase(newCase);
            session.setPhase(Session.Phase.READING);

            // Track the new case as used
            if (session.getUsedCaseIds() == null) {
                session.setUsedCaseIds(new ArrayList<>());
            }
            if (!session.getUsedCaseIds().contains(newCase.getId())) {
                session.getUsedCaseIds().add(newCase.getId());
            }

            sessionRepository.save(session);

            // Reset session participants' completion status
            sessionService.resetParticipantStatus(sessionCode);

            // Notify all participants about the new case and phase change
            webSocketService.broadcastSessionUpdate(sessionCode);
            webSocketService.broadcastPhaseChange(sessionCode, Session.Phase.READING.toString(),
                    session.getReadingTime() * 60, System.currentTimeMillis());

            // Start the timer for the new reading phase
            webSocketService.startTimer(sessionCode);

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

            // Fetch participants as DTOs using optimized method to avoid N+1 queries
            List<SessionParticipantDTO> participantDTOs = sessionService
                    .getSessionParticipantDTOsOptimized(session.getId());

            // Convert DTOs to the same flat structure used in WebSocket updates for
            // consistency
            List<Map<String, Object>> participantDetails = participantDTOs.stream()
                    .filter(dto -> dto.getUser() != null) // Filter out participants with null user
                    .map(dto -> {
                        Map<String, Object> detail = new HashMap<>();
                        detail.put("id", dto.getUser().getId().toString()); // Use userId as id for frontend
                                                                            // compatibility
                        detail.put("userId", dto.getUser().getId());
                        detail.put("name", dto.getUser().getName());
                        detail.put("role", dto.getRole().toString().toLowerCase());
                        detail.put("isOnline", true); // For now, assume all are online
                        detail.put("hasCompleted", false); // Default values for initial load
                        detail.put("hasGivenFeedback", false);
                        return detail;
                    }).toList();

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
            response.put("timeRemaining", session.getTimeRemaining()); // Current remaining time
            response.put("timerStartTimestamp", session.getTimerStartTimestamp()); // Original shared timestamp
            response.put("currentRound", session.getCurrentRound());
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

                        // Broadcast participant update to notify other users about this user's presence
                        webSocketService.broadcastParticipantUpdate(sessionCode);
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
                        filteredCase.put("sections", selectedCase.getDoctorSections());
                    } else {
                        filteredCase.put("sections", selectedCase.getPatientSections());
                    }
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
            response.put("participants", participantDetails);
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

            // Convert DTOs to the same flat structure used in WebSocket updates for
            // consistency
            List<Map<String, Object>> participantDetails = participantDTOs.stream()
                    .filter(dto -> dto.getUser() != null) // Filter out participants with null user
                    .map(dto -> {
                        Map<String, Object> detail = new HashMap<>();
                        detail.put("id", dto.getUser().getId().toString()); // Use userId as id for frontend
                                                                            // compatibility
                        detail.put("userId", dto.getUser().getId());
                        detail.put("name", dto.getUser().getName());
                        detail.put("role", dto.getRole().toString().toLowerCase());
                        detail.put("isOnline", true); // For now, assume all are online
                        detail.put("hasCompleted", false); // Default values for initial load
                        detail.put("hasGivenFeedback", false);
                        return detail;
                    }).toList();

            Map<String, Object> response = new HashMap<>();
            response.put("session", session);
            response.put("participants", participantDetails);
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
            // Use optimized method that avoids loading heavy session data
            List<Session> activeSessions = sessionService.getActiveSessionsOptimized();

            // Convert to DTOs using optimized participant count
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
                        // Use optimized count method to avoid N+1 queries
                        long participantCount = sessionParticipantRepository
                                .countBySessionIdAndIsActive(session.getId(), true);
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

            // Get user's active sessions using optimized method to avoid N+1 queries
            List<SessionParticipant> userParticipations = sessionParticipantRepository
                    .findByUserIdAndIsActiveWithSessions(user.getId(), true);
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

                        // Use optimized count method to avoid N+1 queries
                        long participantCount = sessionParticipantRepository
                                .countBySessionIdAndIsActive(session.getId(), true);
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
    @Cacheable(value = "categories", unless = "#result.body == null")
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

    @PostMapping("/{sessionCode}/select-new-topic")
    public ResponseEntity<?> selectNewTopic(@PathVariable String sessionCode,
            @RequestBody Map<String, String> requestData,
            Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Verify user is in session and has doctor role
            SessionParticipant.Role userRole = sessionService.getUserRoleInSession(sessionCode, user);
            if (userRole != SessionParticipant.Role.DOCTOR) {
                throw new RuntimeException("Only the doctor can select a new topic");
            }

            String newTopic = requestData.get("topic");
            if (newTopic == null || newTopic.trim().isEmpty()) {
                throw new RuntimeException("Topic is required");
            }

            // Get session
            Session session = sessionService.findSessionByCode(sessionCode)
                    .orElseThrow(() -> new RuntimeException("Session not found"));

            // Add new topic to session's selected topics
            Set<String> allTopics = new HashSet<>();
            if (session.getSelectedTopics() != null) {
                try {
                    @SuppressWarnings("unchecked")
                    List<String> existingTopics = objectMapper.readValue(session.getSelectedTopics(), List.class);
                    allTopics.addAll(existingTopics);
                } catch (JsonProcessingException e) {
                    System.err.println("Error parsing existing topics: " + e.getMessage());
                }
            }
            allTopics.add(newTopic);

            // Update session with new topics
            try {
                session.setSelectedTopics(objectMapper.writeValueAsString(new ArrayList<>(allTopics)));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Error updating topics: " + e.getMessage());
            }

            // Select a random case from the new topic
            List<Case> topicCases = caseRepository.findByCategoryNameIn(List.of(newTopic));
            if (topicCases.isEmpty()) {
                throw new RuntimeException("No cases found for topic: " + newTopic);
            }

            Case newCase = topicCases.get((int) (Math.random() * topicCases.size()));
            session.setSelectedCase(newCase);
            session.setPhase(Session.Phase.READING);

            // Track the new case as used
            if (session.getUsedCaseIds() == null) {
                session.setUsedCaseIds(new ArrayList<>());
            }
            if (!session.getUsedCaseIds().contains(newCase.getId())) {
                session.getUsedCaseIds().add(newCase.getId());
            }

            sessionRepository.save(session);

            // Reset participant status
            sessionService.resetParticipantStatus(sessionCode);

            // Notify all participants about the new topic and case
            webSocketService.broadcastSessionUpdate(sessionCode);
            webSocketService.broadcastPhaseChange(sessionCode, Session.Phase.READING.toString(),
                    session.getReadingTime() * 60, System.currentTimeMillis());
            webSocketService.startTimer(sessionCode);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "New topic selected successfully: " + newTopic);
            response.put("newCase", newCase);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to select new topic: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/{sessionCode}/end")
    public ResponseEntity<?> endSession(@PathVariable String sessionCode, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Verify user is in session and has doctor role
            SessionParticipant.Role userRole = sessionService.getUserRoleInSession(sessionCode, user);
            if (userRole != SessionParticipant.Role.DOCTOR) {
                throw new RuntimeException("Only the doctor can end the session");
            }

            // Get session
            Session session = sessionService.findSessionByCode(sessionCode)
                    .orElseThrow(() -> new RuntimeException("Session not found"));

            // End the session properly
            session.setStatus(Session.Status.COMPLETED);
            session.setPhase(Session.Phase.COMPLETED);
            session.setEndTime(LocalDateTime.now());
            sessionRepository.save(session);

            System.out.println("🏁 Session " + sessionCode + " ended by doctor " + user.getName());

            // Notify all participants that session has ended
            webSocketService.endSession(sessionCode, "Session has been ended by the doctor.");

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Session ended successfully");
            response.put("sessionEnded", true);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to end session: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    private List<String> getAvailableTopics(Session session, String excludeTopic) {
        try {
            // Get all categories
            List<Category> allCategories = categoryRepository.findAll();

            // Get already used topics from session configuration
            Set<String> usedTopics = new HashSet<>();
            if (session.getSelectedTopics() != null) {
                try {
                    @SuppressWarnings("unchecked")
                    List<String> sessionTopics = objectMapper.readValue(session.getSelectedTopics(), List.class);
                    usedTopics.addAll(sessionTopics);
                } catch (JsonProcessingException e) {
                    System.err.println("Error parsing selected topics: " + e.getMessage());
                }
            }
            usedTopics.add(excludeTopic); // Also exclude current topic

            // Return available topics
            return allCategories.stream()
                    .map(Category::getName)
                    .filter(name -> !usedTopics.contains(name) && !"Random".equals(name))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            System.err.println("Error getting available topics: " + e.getMessage());
            return new ArrayList<>();
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