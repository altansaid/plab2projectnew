package com.plabpractice.api.repository;

import com.plabpractice.api.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findByCode(String code);

    List<Session> findByEndTimeIsNull();

    List<Session> findByStatus(Session.Status status);

    List<Session> findBySelectedCaseId(Long caseId);

    // NEW: Optimized queries for better performance

    // Session with creator information loaded
    @Query("SELECT s FROM Session s JOIN FETCH s.createdBy WHERE s.code = :code")
    Optional<Session> findByCodeWithCreator(@Param("code") String code);

    // Session with selected case loaded
    @Query("SELECT s FROM Session s LEFT JOIN FETCH s.selectedCase LEFT JOIN FETCH s.selectedCase.category WHERE s.code = :code")
    Optional<Session> findByCodeWithCase(@Param("code") String code);

    // Lightweight session projections for lists - avoids loading heavy fields
    @Query("SELECT s.id, s.title, s.code, s.status, s.phase, s.createdAt, s.startTime FROM Session s WHERE s.status = :status")
    List<Object[]> findSessionProjectionsByStatus(@Param("status") Session.Status status);

    // Active sessions with basic info only
    @Query("SELECT s.id, s.title, s.code, s.status, s.phase, s.createdAt, s.startTime FROM Session s WHERE s.status IN ('CREATED', 'IN_PROGRESS')")
    List<Object[]> findActiveSessionProjections();

    // Count active sessions without loading data
    @Query("SELECT COUNT(s) FROM Session s WHERE s.status IN ('CREATED', 'IN_PROGRESS')")
    long countActiveSessions();

    // Sessions by user with participant information
    @Query("""
            SELECT DISTINCT s FROM Session s
            JOIN FETCH s.participants p
            WHERE p.user.id = :userId AND p.isActive = :isActive
            AND s.status IN ('CREATED', 'IN_PROGRESS')
            """)
    List<Session> findActiveSessionsByUserIdWithParticipants(@Param("userId") Long userId,
            @Param("isActive") Boolean isActive);

    // Find sessions created by a user
    List<Session> findByCreatedBy(com.plabpractice.api.model.User user);

    // Update sessions to remove creator reference (for user deletion)
    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Session s SET s.createdBy = null WHERE s.createdBy.id = :userId")
    void clearCreatorByUserId(@Param("userId") Long userId);
}