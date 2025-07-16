package com.plabpractice.api.repository;

import com.plabpractice.api.model.Case;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CaseRepository extends JpaRepository<Case, Long> {
    List<Case> findByCategoryId(Long categoryId);

    List<Case> findByCategoryName(String categoryName);

    List<Case> findByCategoryNameIn(List<String> categoryNames);

    List<Case> findByTopicsIn(List<String> topics);

    @Query("SELECT DISTINCT c FROM Case c JOIN c.topics t WHERE t IN :topics")
    List<Case> findByAnyTopicIn(@Param("topics") List<String> topics);

    // Recall-specific queries
    List<Case> findByIsRecallCaseTrue();
}