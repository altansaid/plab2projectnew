package com.plabpractice.api.controller;

import com.plabpractice.api.model.*;
import com.plabpractice.api.repository.*;
import com.plabpractice.api.service.FeedbackService;
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
    private UserRepository userRepository;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private SessionParticipantRepository participantRepository;

    @PostMapping("/submit")
    public ResponseEntity<?> submitFeedback(@RequestBody Map<String, Object> feedbackData, Authentication auth) {
        try {
            User user = userRepository.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String sessionCode = (String) feedbackData.get("sessionCode");
            String comment = (String) feedbackData.get("comment");
            Integer rating = (Integer) feedbackData.get("rating");

            // Extract detailed scoring (optional, will fallback to overall rating if not
            // provided)
            Integer clinicalManagementScore = (Integer) feedbackData.getOrDefault("clinicalManagementScore", rating);
            Integer communicationScore = (Integer) feedbackData.getOrDefault("communicationScore", rating);
            Integer professionalismScore = (Integer) feedbackData.getOrDefault("professionalismScore", rating);
            Integer empathyScore = (Integer) feedbackData.getOrDefault("empathyScore", rating);
            Integer examinationSkillsScore = (Integer) feedbackData.getOrDefault("examinationSkillsScore", rating);
            Integer diagnosisAccuracyScore = (Integer) feedbackData.getOrDefault("diagnosisAccuracyScore", rating);
            Integer treatmentPlanScore = (Integer) feedbackData.getOrDefault("treatmentPlanScore", rating);
            Integer dataGatheringScore = (Integer) feedbackData.getOrDefault("dataGatheringScore", rating);
            Integer interpersonalSkillsScore = (Integer) feedbackData.getOrDefault("interpersonalSkillsScore", rating);
            Integer timeManagementScore = (Integer) feedbackData.getOrDefault("timeManagementScore", rating);
            Integer patientSafetyScore = (Integer) feedbackData.getOrDefault("patientSafetyScore", rating);
            Integer decisionMakingScore = (Integer) feedbackData.getOrDefault("decisionMakingScore", rating);
            Integer problemSolvingScore = (Integer) feedbackData.getOrDefault("problemSolvingScore", rating);
            Integer documentationScore = (Integer) feedbackData.getOrDefault("documentationScore", rating);
            Integer teamworkScore = (Integer) feedbackData.getOrDefault("teamworkScore", rating);
            Integer leadershipScore = (Integer) feedbackData.getOrDefault("leadershipScore", rating);
            Integer culturalSensitivityScore = (Integer) feedbackData.getOrDefault("culturalSensitivityScore", rating);
            Integer ethicalAwarenessScore = (Integer) feedbackData.getOrDefault("ethicalAwarenessScore", rating);
            Integer patientRapportScore = (Integer) feedbackData.getOrDefault("patientRapportScore", rating);
            Integer confidenceScore = (Integer) feedbackData.getOrDefault("confidenceScore", rating);

            if (sessionCode == null || comment == null || rating == null) {
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

            // Create feedback
            Feedback feedback = feedbackService.createFeedback(session, user, recipient, comment, rating,
                    clinicalManagementScore, communicationScore, professionalismScore, empathyScore,
                    examinationSkillsScore, diagnosisAccuracyScore, treatmentPlanScore, dataGatheringScore,
                    interpersonalSkillsScore, timeManagementScore, patientSafetyScore, decisionMakingScore,
                    problemSolvingScore, documentationScore, teamworkScore, leadershipScore,
                    culturalSensitivityScore, ethicalAwarenessScore, patientRapportScore, confidenceScore);

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
                    feedbackInfo.put("score", feedback.getScore());
                    feedbackInfo.put("timestamp", feedback.getCreatedAt().toString());

                    // Add detailed scoring information
                    feedbackInfo.put("clinicalManagementScore", feedback.getClinicalManagementScore());
                    feedbackInfo.put("communicationScore", feedback.getCommunicationScore());
                    feedbackInfo.put("professionalismScore", feedback.getProfessionalismScore());
                    feedbackInfo.put("empathyScore", feedback.getEmpathyScore());
                    feedbackInfo.put("examinationSkillsScore", feedback.getExaminationSkillsScore());
                    feedbackInfo.put("diagnosisAccuracyScore", feedback.getDiagnosisAccuracyScore());
                    feedbackInfo.put("treatmentPlanScore", feedback.getTreatmentPlanScore());
                    feedbackInfo.put("dataGatheringScore", feedback.getDataGatheringScore());
                    feedbackInfo.put("interpersonalSkillsScore", feedback.getInterpersonalSkillsScore());
                    feedbackInfo.put("timeManagementScore", feedback.getTimeManagementScore());
                    feedbackInfo.put("patientSafetyScore", feedback.getPatientSafetyScore());
                    feedbackInfo.put("decisionMakingScore", feedback.getDecisionMakingScore());
                    feedbackInfo.put("problemSolvingScore", feedback.getProblemSolvingScore());
                    feedbackInfo.put("documentationScore", feedback.getDocumentationScore());
                    feedbackInfo.put("teamworkScore", feedback.getTeamworkScore());
                    feedbackInfo.put("leadershipScore", feedback.getLeadershipScore());
                    feedbackInfo.put("culturalSensitivityScore", feedback.getCulturalSensitivityScore());
                    feedbackInfo.put("ethicalAwarenessScore", feedback.getEthicalAwarenessScore());
                    feedbackInfo.put("patientRapportScore", feedback.getPatientRapportScore());
                    feedbackInfo.put("confidenceScore", feedback.getConfidenceScore());

                    // Add case information if available
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
                feedbackInfo.put("score", feedback.getScore());
                feedbackInfo.put("timestamp", feedback.getCreatedAt().toString());

                // Add detailed scoring information
                feedbackInfo.put("clinicalManagementScore", feedback.getClinicalManagementScore());
                feedbackInfo.put("communicationScore", feedback.getCommunicationScore());
                feedbackInfo.put("professionalismScore", feedback.getProfessionalismScore());
                feedbackInfo.put("empathyScore", feedback.getEmpathyScore());
                feedbackInfo.put("examinationSkillsScore", feedback.getExaminationSkillsScore());
                feedbackInfo.put("diagnosisAccuracyScore", feedback.getDiagnosisAccuracyScore());
                feedbackInfo.put("treatmentPlanScore", feedback.getTreatmentPlanScore());
                feedbackInfo.put("dataGatheringScore", feedback.getDataGatheringScore());
                feedbackInfo.put("interpersonalSkillsScore", feedback.getInterpersonalSkillsScore());
                feedbackInfo.put("timeManagementScore", feedback.getTimeManagementScore());
                feedbackInfo.put("patientSafetyScore", feedback.getPatientSafetyScore());
                feedbackInfo.put("decisionMakingScore", feedback.getDecisionMakingScore());
                feedbackInfo.put("problemSolvingScore", feedback.getProblemSolvingScore());
                feedbackInfo.put("documentationScore", feedback.getDocumentationScore());
                feedbackInfo.put("teamworkScore", feedback.getTeamworkScore());
                feedbackInfo.put("leadershipScore", feedback.getLeadershipScore());
                feedbackInfo.put("culturalSensitivityScore", feedback.getCulturalSensitivityScore());
                feedbackInfo.put("ethicalAwarenessScore", feedback.getEthicalAwarenessScore());
                feedbackInfo.put("patientRapportScore", feedback.getPatientRapportScore());
                feedbackInfo.put("confidenceScore", feedback.getConfidenceScore());

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