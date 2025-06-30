package com.plabpractice.api.repository;

import com.plabpractice.api.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findBySessionId(Long sessionId);

    List<Feedback> findBySenderId(Long senderId);

    List<Feedback> findByRecipientId(Long recipientId);

    List<Feedback> findBySessionIdAndSenderId(Long sessionId, Long senderId);

    @Query("SELECT AVG(f.score) FROM Feedback f WHERE f.session.id = :sessionId")
    Double getAverageScoreBySessionId(Long sessionId);

    @Query("SELECT AVG(f.score) FROM Feedback f WHERE f.sender.id = :senderId")
    Double getAverageScoreBySenderId(Long senderId);

    @Query("SELECT AVG(f.score) FROM Feedback f WHERE f.recipient.id = :recipientId")
    Double getAverageScoreByRecipientId(Long recipientId);
}