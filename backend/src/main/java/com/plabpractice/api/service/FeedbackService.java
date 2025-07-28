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

    public Feedback createFeedback(Session session, User sender, User recipient, String comment,
            List<Feedback.FeedbackScore> criteriaScores) {

        Feedback feedback = new Feedback();
        feedback.setSession(session);
        feedback.setSender(sender);
        feedback.setRecipient(recipient);
        feedback.setCaseId(session.getSelectedCase().getId());
        feedback.setRoundNumber(session.getCurrentRound());
        feedback.setComment(comment);
        feedback.setCriteriaScores(criteriaScores);
        feedback.setCreatedAt(LocalDateTime.now());

        // Calculate overall performance from criteria scores
        double overallPerformance = calculateOverallPerformance(criteriaScores);
        feedback.setOverallPerformance(overallPerformance);

        // Set legacy score field (rounded integer version of overallPerformance)
        int legacyScore = (int) Math.round(overallPerformance);
        feedback.setScore(legacyScore);

        try {
            Feedback savedFeedback = feedbackRepository.save(feedback);
            return savedFeedback;
        } catch (Exception e) {
            throw e;
        }
    }

    private double calculateOverallPerformance(List<Feedback.FeedbackScore> criteriaScores) {
        if (criteriaScores == null || criteriaScores.isEmpty()) {
            return 0.0;
        }

        double totalScore = 0.0;
        int count = 0;

        for (Feedback.FeedbackScore criteriaScore : criteriaScores) {
            if (criteriaScore.getScore() != null) {
                // Direct score
                totalScore += criteriaScore.getScore();
                count++;
            } else if (criteriaScore.getSubScores() != null && !criteriaScore.getSubScores().isEmpty()) {
                // Calculate average of sub-scores
                double subTotal = 0.0;
                int subCount = 0;
                for (Feedback.FeedbackSubScore subScore : criteriaScore.getSubScores()) {
                    if (subScore.getScore() != null) {
                        subTotal += subScore.getScore();
                        subCount++;
                    }
                }
                if (subCount > 0) {
                    totalScore += (subTotal / subCount);
                    count++;
                }
            }
        }

        return totalScore; // Return sum of all main criteria scores
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