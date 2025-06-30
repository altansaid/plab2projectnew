package com.plabpractice.api.repository;

import com.plabpractice.api.model.Case;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CaseRepository extends JpaRepository<Case, Long> {
    List<Case> findByCategoryId(Long categoryId);

    List<Case> findByDifficulty(Case.Difficulty difficulty);

    List<Case> findByCategoryName(String categoryName);

    List<Case> findByCategoryNameIn(List<String> categoryNames);
}