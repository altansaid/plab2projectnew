package com.plabpractice.api.controller;

import com.plabpractice.api.model.*;
import com.plabpractice.api.repository.*;
import com.plabpractice.api.service.FeedbackService;
import com.plabpractice.api.service.SessionService;
import com.plabpractice.api.service.SessionWebSocketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/feedback")
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:3001", "http://localhost:5173" })
public class FeedbackController {

    @Autowired
    private FeedbackService feedbackService;

    @Autowired
    private SessionService sessionService;

    @Autowired
    private SessionWebSocketService webSocketService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private SessionParticipantRepository participantRepository;

    @Autowired
    private CaseRepository caseRepository;

    @PostMapping("/submit")
    @Transactional
    public ResponseEntity<?> submitFeedback(@RequestBody Map<String, Object> feedbackData, Authentication auth) {
        try {

            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String sessionCode = (String) feedbackData.get("sessionCode");
            String comment = (String) feedbackData.get("comment");
            Boolean requestNewCase = (Boolean) feedbackData.get("requestNewCase");
            Boolean requestRoleChange = (Boolean) feedbackData.get("requestRoleChange");

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> criteriaScoresData = (List<Map<String, Object>>) feedbackData
                    .get("criteriaScores");

            if (sessionCode == null || comment == null || criteriaScoresData == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Missing required fields");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            Session session = sessionRepository.findByCode(sessionCode)
                    .orElseThrow(() -> new RuntimeException("Session not found"));

            // Find the doctor (recipient) from session participants
            Optional<SessionParticipant> doctorParticipant = participantRepository
                    .findBySessionIdAndRole(session.getId(), SessionParticipant.Role.DOCTOR)
                    .stream()
                    .findFirst();

            if (doctorParticipant.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "No doctor found in this session");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            User recipient = doctorParticipant.get().getUser();

            // Convert criteria scores data to Feedback.FeedbackScore objects
            List<Feedback.FeedbackScore> criteriaScores = new ArrayList<>();
            for (Map<String, Object> scoreData : criteriaScoresData) {
                String criterionId = (String) scoreData.get("criterionId");
                String criterionName = (String) scoreData.get("criterionName");
                Double score = scoreData.get("score") != null ? Double.valueOf(scoreData.get("score").toString())
                        : null;

                @SuppressWarnings("unchecked")
                List<Map<String, Object>> subScoresData = (List<Map<String, Object>>) scoreData.get("subScores");

                List<Feedback.FeedbackSubScore> subScores = new ArrayList<>();
                if (subScoresData != null) {
                    for (Map<String, Object> subScoreData : subScoresData) {
                        String subCriterionId = (String) subScoreData.get("subCriterionId");
                        String subCriterionName = (String) subScoreData.get("subCriterionName");
                        Double subScore = subScoreData.get("score") != null
                                ? Double.valueOf(subScoreData.get("score").toString())
                                : null;

                        subScores.add(new Feedback.FeedbackSubScore(subCriterionId, subCriterionName, subScore));
                    }
                }

                criteriaScores.add(new Feedback.FeedbackScore(criterionId, criterionName, score, subScores));
            }

            // Create feedback - this must be saved first before any role changes
            Feedback feedback = feedbackService.createFeedback(session, user, recipient, comment, criteriaScores);

            // Track the current case as used when feedback is submitted
            if (session.getSelectedCase() != null) {
                if (session.getUsedCaseIds() == null) {
                    session.setUsedCaseIds(new ArrayList<>());
                }
                if (!session.getUsedCaseIds().contains(session.getSelectedCase().getId())) {
                    session.getUsedCaseIds().add(session.getSelectedCase().getId());
                    sessionRepository.save(session);
                }
            }

            // Mark user as having given feedback
            sessionService.markUserFeedbackGiven(sessionCode, user);

            // Also mark user as having completed their session (since feedback submission =
            // session completion)
            sessionService.markUserSessionCompleted(sessionCode, user);

            // Notify other participants via WebSocket about the completion
            webSocketService.broadcastParticipantUpdate(sessionCode);

            // Handle new case request immediately if requested
            boolean shouldStartNewCase = false;
            if (requestNewCase != null && requestNewCase) {
                if (requestRoleChange != null && requestRoleChange) {
                    // Start new case with role change - this happens AFTER feedback is saved
                    shouldStartNewCase = startNewCaseWithRoleChange(session, user);
                } else {
                    // Start new case immediately when requested
                    shouldStartNewCase = startNewCaseAutomatically(session);
                }
            } else {
                // Check if both patient and observer have submitted feedback for auto new case
                shouldStartNewCase = checkAndHandleNewCaseRequest(session);
            }

            // Check if all users are completed to end the session (only if not starting new
            // case)
            if (!shouldStartNewCase && sessionService.areAllUsersCompleted(sessionCode)) {
                webSocketService.endSession(sessionCode, "All participants have completed their sessions");
            }

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Feedback submitted successfully");
            response.put("feedbackId", feedback.getId());
            if (shouldStartNewCase) {
                response.put("newCaseStarted", true);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to submit feedback: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    private boolean checkAndHandleNewCaseRequest(Session session) {
        try {
            // Check if both patient and observer have given feedback
            boolean patientGaveFeedback = sessionService.hasUserWithRoleGivenFeedback(session.getCode(),
                    SessionParticipant.Role.PATIENT);
            boolean observerGaveFeedback = sessionService.hasUserWithRoleGivenFeedback(session.getCode(),
                    SessionParticipant.Role.OBSERVER);

            if (patientGaveFeedback && observerGaveFeedback) {
                // Both have given feedback, try to start new case automatically
                boolean newCaseStarted = startNewCaseAutomatically(session);

                // If no new case could be started and this is a recall session, check if we
                // should end the session
                if (!newCaseStarted && session.getSessionType() == Session.SessionType.RECALL) {
                    // No more cases available in recall date range - end the session
                    System.out.println("🎊 All recall cases completed in date range during feedback - ending session");
                    session.setStatus(Session.Status.COMPLETED);
                    session.setPhase(Session.Phase.COMPLETED);
                    session.setEndTime(LocalDateTime.now());
                    sessionRepository.save(session);

                    // Notify all participants that session is complete
                    webSocketService.endSession(session.getCode(),
                            "🎊 Congratulations! You have completed all available cases in the selected recall date range.");
                }

                return newCaseStarted;
            }
        } catch (Exception e) {
            // Log error silently
            System.err.println("Error in checkAndHandleNewCaseRequest: " + e.getMessage());
        }
        return false;
    }

    private boolean startNewCaseAutomatically(Session session) {
        try {
            // Get a new random case based on session type and exclusions
            Case currentCase = session.getSelectedCase();
            Case newCase = null;

            if (session.getSessionType() == Session.SessionType.RECALL) {
                // For recall sessions, select from recall cases within date range
                if (session.getRecallStartDate() != null && session.getRecallEndDate() != null) {
                    // Date range mode
                    List<Case> allRecallCases = caseRepository.findByIsRecallCaseTrue();
                    // Use consistent filtering logic (same as SessionController)
                    List<Long> usedIds = session.getUsedCaseIds() != null ? session.getUsedCaseIds()
                            : new ArrayList<>();
                    List<Case> availableCases = allRecallCases.stream()
                            .filter(c -> c.getRecallDates() != null &&
                                    c.getRecallDates().stream().anyMatch(
                                            date -> date.compareTo(session.getRecallStartDate().toString()) >= 0 &&
                                                    date.compareTo(session.getRecallEndDate().toString()) <= 0))
                            .filter(c -> !usedIds.contains(c.getId()))
                            .collect(Collectors.toList());

                    if (!availableCases.isEmpty()) {
                        newCase = availableCases.get((int) (Math.random() * availableCases.size()));
                    }
                } else {
                    // No date range info available
                    return false;
                }
            } else {
                // For topic-based sessions, select from same category but exclude used cases
                if (currentCase == null || currentCase.getCategory() == null) {
                    return false;
                }

                // Get all cases in the same category excluding used ones
                List<Case> categoryCases = caseRepository.findByCategoryId(currentCase.getCategory().getId());

                // Use consistent filtering logic (same as SessionController)
                List<Long> usedIds = session.getUsedCaseIds() != null ? session.getUsedCaseIds() : new ArrayList<>();
                List<Case> availableCases = categoryCases.stream()
                        .filter(c -> !usedIds.contains(c.getId()))
                        .collect(Collectors.toList());

                if (!availableCases.isEmpty()) {
                    newCase = availableCases.get((int) (Math.random() * availableCases.size()));
                } else {
                    // No more cases available in this category - don't reset, just return false
                    return false;
                }
            }

            if (newCase == null) {
                return false;
            }

            // Update session with new case
            session.setSelectedCase(newCase);
            session.setPhase(Session.Phase.READING);
            session.setCurrentRound(session.getCurrentRound() + 1); // Increment round number

            // Track the new case as used
            if (session.getUsedCaseIds() == null) {
                session.setUsedCaseIds(new ArrayList<>());
            }
            if (!session.getUsedCaseIds().contains(newCase.getId())) {
                session.getUsedCaseIds().add(newCase.getId());
            }

            sessionRepository.save(session);

            // Reset session participants' completion status
            sessionService.resetParticipantStatus(session.getCode());

            // Notify all participants about the new case and phase change
            webSocketService.broadcastSessionUpdate(session.getCode());
            webSocketService.broadcastPhaseChange(session.getCode(), Session.Phase.READING.toString(),
                    session.getReadingTime() * 60, System.currentTimeMillis());

            // Start the timer for the new reading phase
            webSocketService.startTimer(session.getCode());

            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean startNewCaseWithRoleChange(Session session, User requestingUser) {
        try {
            // Get a new random case based on session type and exclusions
            Case currentCase = session.getSelectedCase();
            Case newCase = null;

            if (session.getSessionType() == Session.SessionType.RECALL) {
                // For recall sessions, select from recall cases within date range
                if (session.getRecallStartDate() != null && session.getRecallEndDate() != null) {
                    // Date range mode
                    List<Case> allRecallCases = caseRepository.findByIsRecallCaseTrue();
                    // Use consistent filtering logic (same as SessionController)
                    List<Long> usedIds = session.getUsedCaseIds() != null ? session.getUsedCaseIds()
                            : new ArrayList<>();
                    List<Case> availableCases = allRecallCases.stream()
                            .filter(c -> c.getRecallDates() != null &&
                                    c.getRecallDates().stream().anyMatch(
                                            date -> date.compareTo(session.getRecallStartDate().toString()) >= 0 &&
                                                    date.compareTo(session.getRecallEndDate().toString()) <= 0))
                            .filter(c -> !usedIds.contains(c.getId()))
                            .collect(Collectors.toList());

                    if (!availableCases.isEmpty()) {
                        newCase = availableCases.get((int) (Math.random() * availableCases.size()));
                    }
                } else {
                    // No date range info available
                    return false;
                }
            } else {
                // For topic-based sessions, select from same category but exclude used cases
                if (currentCase == null || currentCase.getCategory() == null) {
                    return false;
                }

                // Get all cases in the same category excluding used ones
                List<Case> categoryCases = caseRepository.findByCategoryId(currentCase.getCategory().getId());

                // Use consistent filtering logic (same as SessionController)
                List<Long> usedIds = session.getUsedCaseIds() != null ? session.getUsedCaseIds() : new ArrayList<>();
                List<Case> availableCases = categoryCases.stream()
                        .filter(c -> !usedIds.contains(c.getId()))
                        .collect(Collectors.toList());

                if (!availableCases.isEmpty()) {
                    newCase = availableCases.get((int) (Math.random() * availableCases.size()));
                } else {
                    // No more cases available in this category - don't reset, just return false
                    System.out.println("❌ No more cases available in category " + currentCase.getCategory().getName()
                            + " for role change");
                    return false;
                }
            }

            if (newCase == null) {
                return false;
            }

            // Find and swap doctor and patient roles
            List<SessionParticipant> participants = participantRepository.findBySessionIdAndIsActive(session.getId(),
                    true);

            SessionParticipant doctorParticipant = null;
            SessionParticipant patientParticipant = null;

            for (SessionParticipant participant : participants) {
                if (participant.getRole() == SessionParticipant.Role.DOCTOR) {
                    doctorParticipant = participant;
                } else if (participant.getRole() == SessionParticipant.Role.PATIENT) {
                    patientParticipant = participant;
                }
            }

            // Swap roles if both doctor and patient exist
            if (doctorParticipant != null && patientParticipant != null) {
                String doctorName = doctorParticipant.getUser().getName();
                String patientName = patientParticipant.getUser().getName();

                doctorParticipant.setRole(SessionParticipant.Role.PATIENT);
                patientParticipant.setRole(SessionParticipant.Role.DOCTOR);

                participantRepository.save(doctorParticipant);
                participantRepository.save(patientParticipant);

                // Broadcast role change notification
                webSocketService.broadcastRoleChange(session.getCode(),
                        "Roles have been swapped: " + doctorName + " is now Patient, " + patientName
                                + " is now Doctor");
            }

            // Update session with new case
            session.setSelectedCase(newCase);
            session.setPhase(Session.Phase.READING);
            session.setCurrentRound(session.getCurrentRound() + 1); // Increment round number

            // Track the new case as used
            if (session.getUsedCaseIds() == null) {
                session.setUsedCaseIds(new ArrayList<>());
            }
            if (!session.getUsedCaseIds().contains(newCase.getId())) {
                session.getUsedCaseIds().add(newCase.getId());
            }

            sessionRepository.save(session);

            // Reset session participants' completion status
            sessionService.resetParticipantStatus(session.getCode());

            // Notify all participants about the new case and phase change
            webSocketService.broadcastSessionUpdate(session.getCode());
            webSocketService.broadcastPhaseChange(session.getCode(), Session.Phase.READING.toString(),
                    session.getReadingTime() * 60, System.currentTimeMillis());

            // Start the timer for the new reading phase
            webSocketService.startTimer(session.getCode());

            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @GetMapping("/received")
    public ResponseEntity<?> getReceivedFeedback(Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Find all feedback where this user was the recipient (regardless of current
            // role)
            // This correctly handles role switching scenarios
            List<Feedback> allUserFeedback = feedbackService.getUserReceivedFeedback(user.getId());

            List<Map<String, Object>> allFeedback = new ArrayList<>();

            for (Feedback feedback : allUserFeedback) {
                Session session = feedback.getSession();
                Map<String, Object> feedbackInfo = new HashMap<>();
                feedbackInfo.put("id", feedback.getId());
                feedbackInfo.put("sessionId", session.getId());
                feedbackInfo.put("sessionCode", session.getCode());
                feedbackInfo.put("sessionTitle", session.getTitle());
                feedbackInfo.put("fromUser", feedback.getSender().getName());
                feedbackInfo.put("fromUserEmail", feedback.getSender().getEmail());

                // Add recipient information
                feedbackInfo.put("toUser", feedback.getRecipient().getName());
                feedbackInfo.put("toUserEmail", feedback.getRecipient().getEmail());

                // Find the role of the feedback giver in that session
                Optional<SessionParticipant> feedbackGiverParticipation = participantRepository
                        .findBySessionIdAndUserId(session.getId(), feedback.getSender().getId());

                if (feedbackGiverParticipation.isPresent()) {
                    feedbackInfo.put("fromUserRole",
                            feedbackGiverParticipation.get().getRole().toString().toLowerCase());
                } else {
                    feedbackInfo.put("fromUserRole", "unknown");
                }

                feedbackInfo.put("comment", feedback.getComment());
                feedbackInfo.put("overallPerformance", feedback.getOverallPerformance());
                feedbackInfo.put("timestamp", feedback.getCreatedAt().toString());

                // Add dynamic criteria scores
                feedbackInfo.put("criteriaScores", feedback.getCriteriaScores());

                // Add case information from the feedback's stored caseId and round number
                feedbackInfo.put("roundNumber", feedback.getRoundNumber());

                if (feedback.getCaseId() != null) {
                    // Get the specific case that was used for this feedback
                    Optional<Case> feedbackCase = caseRepository.findById(feedback.getCaseId());
                    if (feedbackCase.isPresent()) {
                        Case caseData = feedbackCase.get();
                        feedbackInfo.put("caseTitle", caseData.getTitle());
                        feedbackInfo.put("caseId", caseData.getId());
                        feedbackInfo.put("category", caseData.getCategory().getName());
                    } else {
                        feedbackInfo.put("caseTitle", "Case not found (ID: " + feedback.getCaseId() + ")");
                        feedbackInfo.put("caseId", feedback.getCaseId());
                        feedbackInfo.put("category", "Unknown");
                    }
                } else {
                    // Fallback to session's current case for older feedback
                    if (session.getSelectedCase() != null) {
                        feedbackInfo.put("caseTitle", session.getSelectedCase().getTitle());
                        feedbackInfo.put("caseId", session.getSelectedCase().getId());
                        feedbackInfo.put("category", session.getSelectedCase().getCategory().getName());
                    } else {
                        feedbackInfo.put("caseTitle", "No case selected");
                        feedbackInfo.put("caseId", null);
                        feedbackInfo.put("category", "Unknown");
                    }
                }

                allFeedback.add(feedbackInfo);
            }

            // Sort by timestamp (newest first)
            allFeedback.sort((a, b) -> {
                String timestampA = (String) a.get("timestamp");
                String timestampB = (String) b.get("timestamp");
                return timestampB.compareTo(timestampA);
            });

            return ResponseEntity.ok(allFeedback);

        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch feedback: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/session/{sessionCode}")
    public ResponseEntity<?> getSessionFeedback(@PathVariable String sessionCode, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Session session = sessionRepository.findByCode(sessionCode)
                    .orElseThrow(() -> new RuntimeException("Session not found"));

            // Check if user was a participant in this session
            Optional<SessionParticipant> participation = participantRepository
                    .findBySessionIdAndUserId(session.getId(), user.getId());

            if (participation.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "You were not a participant in this session");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            List<Feedback> sessionFeedback = feedbackService.getSessionFeedback(session.getId());

            List<Map<String, Object>> feedbackList = sessionFeedback.stream().map(feedback -> {
                Map<String, Object> feedbackInfo = new HashMap<>();
                feedbackInfo.put("id", feedback.getId());
                feedbackInfo.put("fromUser", feedback.getSender().getName());
                feedbackInfo.put("toUser", feedback.getRecipient().getName());
                feedbackInfo.put("toUserEmail", feedback.getRecipient().getEmail());
                feedbackInfo.put("comment", feedback.getComment());
                feedbackInfo.put("overallPerformance", feedback.getOverallPerformance());
                feedbackInfo.put("timestamp", feedback.getCreatedAt().toString());

                // Add dynamic criteria scores
                feedbackInfo.put("criteriaScores", feedback.getCriteriaScores());

                return feedbackInfo;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(feedbackList);

        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch session feedback: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
}