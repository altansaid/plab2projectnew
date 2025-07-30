package com.plabpractice.api.repository;

import com.plabpractice.api.model.Case;
import org.springframework.data.domain.Pageable;
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

    // NEW: Optimized queries for better performance

    // Random case selection without loading all cases
    @Query(value = "SELECT * FROM cases ORDER BY RANDOM() LIMIT 1", nativeQuery = true)
    Case findRandomCase();

    // Random case from specific category
    @Query(value = "SELECT c.* FROM cases c WHERE c.category_id = :categoryId ORDER BY RANDOM() LIMIT 1", nativeQuery = true)
    Case findRandomCaseByCategoryId(@Param("categoryId") Long categoryId);

    // Random case from multiple categories
    @Query(value = "SELECT c.* FROM cases c INNER JOIN categories cat ON c.category_id = cat.id WHERE cat.name IN :categoryNames ORDER BY RANDOM() LIMIT 1", nativeQuery = true)
    Case findRandomCaseByCategoryNames(@Param("categoryNames") List<String> categoryNames);

    // Optimized query with JOIN FETCH to load topics in one query
    @Query("SELECT DISTINCT c FROM Case c LEFT JOIN FETCH c.topics WHERE c.category.name IN :categoryNames")
    List<Case> findByCategoryNameInWithTopics(@Param("categoryNames") List<String> categoryNames);

    // Optimized query for cases with category information
    @Query("SELECT c FROM Case c JOIN FETCH c.category WHERE c.id IN :ids")
    List<Case> findByIdInWithCategory(@Param("ids") List<Long> ids);

    // Count cases by category - useful for pagination
    @Query("SELECT COUNT(c) FROM Case c WHERE c.category.name IN :categoryNames")
    long countByCategoryNameIn(@Param("categoryNames") List<String> categoryNames);

    // Random recall case within date range
    @Query(value = """
            SELECT c.* FROM cases c
            WHERE c.is_recall_case = true
            AND EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(c.recall_dates) AS rd
                WHERE rd::date BETWEEN :startDate::date AND :endDate::date
            )
            AND (:excludeIds IS NULL OR c.id NOT IN :excludeIds)
            ORDER BY RANDOM() LIMIT 1
            """, nativeQuery = true)
    Case findRandomRecallCaseInDateRange(
            @Param("startDate") String startDate,
            @Param("endDate") String endDate,
            @Param("excludeIds") List<Long> excludeIds);

    // Lightweight case projection for lists - only essential fields
    @Query("SELECT c.id, c.title, c.category.name FROM Case c WHERE c.category.name IN :categoryNames")
    List<Object[]> findCaseProjectionsByCategoryNames(@Param("categoryNames") List<String> categoryNames);
}