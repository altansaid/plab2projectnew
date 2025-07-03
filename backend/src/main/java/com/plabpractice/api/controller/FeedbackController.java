package com.plabpractice.api.controller;

import com.plabpractice.api.model.*;
import com.plabpractice.api.repository.*;
import com.plabpractice.api.service.FeedbackService;
import com.plabpractice.api.service.SessionService;
import com.plabpractice.api.service.SessionWebSocketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

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

    @PostMapping("/submit")
    public ResponseEntity<?> submitFeedback(@RequestBody Map<String, Object> feedbackData, Authentication auth) {
        try {
            System.out.println("🚀 Feedback submission received!");
            System.out.println("📊 Raw feedback data: " + feedbackData);
            System.out.println("👤 User: " + auth.getName());

            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String sessionCode = (String) feedbackData.get("sessionCode");
            String comment = (String) feedbackData.get("comment");

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> criteriaScoresData = (List<Map<String, Object>>) feedbackData
                    .get("criteriaScores");

            System.out.println("🔍 Parsed values:");
            System.out.println("   sessionCode: " + sessionCode);
            System.out.println("   comment: " + comment);
            System.out.println("   criteriaScoresData: " + criteriaScoresData);
            System.out.println(
                    "   criteriaScoresData size: " + (criteriaScoresData != null ? criteriaScoresData.size() : "null"));

            if (sessionCode == null || comment == null || criteriaScoresData == null) {
                System.out.println("❌ Missing required fields validation failed!");
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Missing required fields");
                errorResponse.put("debug", Map.of(
                        "sessionCode", sessionCode,
                        "comment", comment,
                        "criteriaScores", criteriaScoresData));
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

            // Create feedback
            Feedback feedback = feedbackService.createFeedback(session, user, recipient, comment, criteriaScores);

            // Mark user as having given feedback
            sessionService.markUserFeedbackGiven(sessionCode, user);

            // Also mark user as having completed their session (since feedback submission =
            // session completion)
            sessionService.markUserSessionCompleted(sessionCode, user);

            // Notify other participants via WebSocket about the completion
            webSocketService.broadcastParticipantUpdate(sessionCode);

            // Check if all users are completed to end the session
            if (sessionService.areAllUsersCompleted(sessionCode)) {
                webSocketService.endSession(sessionCode, "All participants have completed their sessions");
            }

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Feedback submitted successfully");
            response.put("feedbackId", feedback.getId());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to submit feedback: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/received")
    public ResponseEntity<?> getReceivedFeedback(Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Find all sessions where this user was a doctor
            List<SessionParticipant> doctorParticipations = participantRepository
                    .findByUserIdAndRole(user.getId(), SessionParticipant.Role.DOCTOR);

            List<Map<String, Object>> allFeedback = new ArrayList<>();

            for (SessionParticipant participation : doctorParticipations) {
                Session session = participation.getSession();

                // Get all feedback for this session (excluding feedback from the doctor
                // themselves)
                List<Feedback> sessionFeedback = feedbackService.getSessionFeedback(session.getId())
                        .stream()
                        .filter(feedback -> !feedback.getSender().getId().equals(user.getId()))
                        .collect(Collectors.toList());

                for (Feedback feedback : sessionFeedback) {
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

                    // Add case information if available
                    // Note: Case title is shown in feedback phase since practice is already
                    // completed
                    if (session.getSelectedCase() != null) {
                        feedbackInfo.put("caseTitle", session.getSelectedCase().getTitle());
                        feedbackInfo.put("caseId", session.getSelectedCase().getId());
                        feedbackInfo.put("category", session.getSelectedCase().getCategory().getName());
                    } else {
                        feedbackInfo.put("caseTitle", "No case selected");
                        feedbackInfo.put("caseId", null);
                        feedbackInfo.put("category", "Unknown");
                    }

                    allFeedback.add(feedbackInfo);
                }
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