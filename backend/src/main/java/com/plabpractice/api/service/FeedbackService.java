package com.plabpractice.api.service;

import com.plabpractice.api.model.Feedback;
import com.plabpractice.api.model.Session;
import com.plabpractice.api.model.User;
import com.plabpractice.api.repository.FeedbackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class FeedbackService {

    @Autowired
    private FeedbackRepository feedbackRepository;

    public Feedback createFeedback(Session session, User sender, User recipient, String comment, Integer score,
            Integer clinicalManagementScore, Integer communicationScore, Integer professionalismScore,
            Integer empathyScore, Integer examinationSkillsScore, Integer diagnosisAccuracyScore,
            Integer treatmentPlanScore, Integer dataGatheringScore, Integer interpersonalSkillsScore,
            Integer timeManagementScore, Integer patientSafetyScore, Integer decisionMakingScore,
            Integer problemSolvingScore, Integer documentationScore, Integer teamworkScore,
            Integer leadershipScore, Integer culturalSensitivityScore, Integer ethicalAwarenessScore,
            Integer patientRapportScore, Integer confidenceScore) {

        Feedback feedback = new Feedback();
        feedback.setSession(session);
        feedback.setSender(sender);
        feedback.setRecipient(recipient);
        feedback.setComment(comment);
        feedback.setScore(score);
        feedback.setCreatedAt(LocalDateTime.now());

        // Set all detailed scores
        feedback.setClinicalManagementScore(clinicalManagementScore);
        feedback.setCommunicationScore(communicationScore);
        feedback.setProfessionalismScore(professionalismScore);
        feedback.setEmpathyScore(empathyScore);
        feedback.setExaminationSkillsScore(examinationSkillsScore);
        feedback.setDiagnosisAccuracyScore(diagnosisAccuracyScore);
        feedback.setTreatmentPlanScore(treatmentPlanScore);
        feedback.setDataGatheringScore(dataGatheringScore);
        feedback.setInterpersonalSkillsScore(interpersonalSkillsScore);
        feedback.setTimeManagementScore(timeManagementScore);
        feedback.setPatientSafetyScore(patientSafetyScore);
        feedback.setDecisionMakingScore(decisionMakingScore);
        feedback.setProblemSolvingScore(problemSolvingScore);
        feedback.setDocumentationScore(documentationScore);
        feedback.setTeamworkScore(teamworkScore);
        feedback.setLeadershipScore(leadershipScore);
        feedback.setCulturalSensitivityScore(culturalSensitivityScore);
        feedback.setEthicalAwarenessScore(ethicalAwarenessScore);
        feedback.setPatientRapportScore(patientRapportScore);
        feedback.setConfidenceScore(confidenceScore);

        return feedbackRepository.save(feedback);
    }

    public List<Feedback> getSessionFeedback(Long sessionId) {
        return feedbackRepository.findBySessionId(sessionId);
    }

    public List<Feedback> getUserSentFeedback(Long userId) {
        return feedbackRepository.findBySenderId(userId);
    }

    public List<Feedback> getUserReceivedFeedback(Long userId) {
        return feedbackRepository.findByRecipientId(userId);
    }

    public Double getSessionAverageScore(Long sessionId) {
        return feedbackRepository.getAverageScoreBySessionId(sessionId);
    }

    public Double getUserSentAverageScore(Long userId) {
        return feedbackRepository.getAverageScoreBySenderId(userId);
    }

    public Double getUserReceivedAverageScore(Long userId) {
        return feedbackRepository.getAverageScoreByRecipientId(userId);
    }
}