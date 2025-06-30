package com.plabpractice.api.repository;

import com.plabpractice.api.model.SessionParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SessionParticipantRepository extends JpaRepository<SessionParticipant, Long> {
    List<SessionParticipant> findBySessionId(Long sessionId);

    List<SessionParticipant> findByUserId(Long userId);

    Optional<SessionParticipant> findBySessionIdAndUserId(Long sessionId, Long userId);

    List<SessionParticipant> findByRole(SessionParticipant.Role role);

    List<SessionParticipant> findByUserIdAndRole(Long userId, SessionParticipant.Role role);

    List<SessionParticipant> findBySessionIdAndRole(Long sessionId, SessionParticipant.Role role);

    boolean existsBySessionIdAndUserId(Long sessionId, Long userId);

    long countBySessionId(Long sessionId);
}