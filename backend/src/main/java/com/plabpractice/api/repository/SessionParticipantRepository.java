package com.plabpractice.api.repository;

import com.plabpractice.api.model.SessionParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SessionParticipantRepository extends JpaRepository<SessionParticipant, Long> {
    List<SessionParticipant> findBySessionId(Long sessionId);

    // Optimized query to prevent N+1 issue
    @Query("SELECT sp FROM SessionParticipant sp JOIN FETCH sp.user WHERE sp.session.id = :sessionId")
    List<SessionParticipant> findBySessionIdWithUser(@Param("sessionId") Long sessionId);

    // Active participants only
    List<SessionParticipant> findBySessionIdAndIsActive(Long sessionId, Boolean isActive);

    @Query("SELECT sp FROM SessionParticipant sp JOIN FETCH sp.user WHERE sp.session.id = :sessionId AND sp.isActive = :isActive")
    List<SessionParticipant> findBySessionIdAndIsActiveWithUser(@Param("sessionId") Long sessionId,
            @Param("isActive") Boolean isActive);

    List<SessionParticipant> findByUserId(Long userId);

    List<SessionParticipant> findByUserIdAndIsActive(Long userId, Boolean isActive);

    Optional<SessionParticipant> findBySessionIdAndUserId(Long sessionId, Long userId);

    List<SessionParticipant> findByRole(SessionParticipant.Role role);

    List<SessionParticipant> findByUserIdAndRole(Long userId, SessionParticipant.Role role);

    List<SessionParticipant> findBySessionIdAndRole(Long sessionId, SessionParticipant.Role role);

    boolean existsBySessionIdAndUserId(Long sessionId, Long userId);

    boolean existsBySessionIdAndUserIdAndIsActive(Long sessionId, Long userId, Boolean isActive);

    long countBySessionId(Long sessionId);

    long countBySessionIdAndIsActive(Long sessionId, Boolean isActive);
}