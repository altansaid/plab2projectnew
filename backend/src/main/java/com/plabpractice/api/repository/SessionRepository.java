package com.plabpractice.api.repository;

import com.plabpractice.api.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findByCode(String code);

    List<Session> findByEndTimeIsNull();

    List<Session> findByStatus(Session.Status status);
}