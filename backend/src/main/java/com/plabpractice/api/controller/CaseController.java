package com.plabpractice.api.controller;

import com.plabpractice.api.model.Case;
import com.plabpractice.api.model.Category;
import com.plabpractice.api.repository.CaseRepository;
import com.plabpractice.api.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/cases")
@CrossOrigin(origins = "*")
public class CaseController {

    @Autowired
    private CaseRepository caseRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @GetMapping
    public ResponseEntity<List<Case>> getAllCases() {
        List<Case> cases = caseRepository.findAll();
        return ResponseEntity.ok(cases);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Case> getCaseById(@PathVariable Long id) {
        return caseRepository.findById(id)
                .map(case_ -> ResponseEntity.ok().body(case_))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-category/{categoryId}")
    public ResponseEntity<List<Case>> getCasesByCategory(@PathVariable Long categoryId) {
        List<Case> cases = caseRepository.findByCategoryId(categoryId);
        return ResponseEntity.ok(cases);
    }

    @GetMapping("/by-topics")
    public ResponseEntity<Map<String, List<Case>>> getCasesByTopics(@RequestParam List<String> topics) {
        Map<String, List<Case>> casesByTopic = topics.stream()
                .collect(Collectors.toMap(
                        topic -> topic,
                        topic -> {
                            if ("Random".equals(topic)) {
                                return caseRepository.findAll();
                            } else {
                                return caseRepository.findByCategoryName(topic);
                            }
                        },
                        (existing, replacement) -> existing // Handle duplicate keys
                ));
        return ResponseEntity.ok(casesByTopic);
    }

    @GetMapping("/categories")
    public ResponseEntity<List<Category>> getAllCategories() {
        List<Category> categories = categoryRepository.findAll();
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/random")
    public ResponseEntity<Case> getRandomCase(@RequestParam(required = false) List<String> topics) {
        List<Case> availableCases;

        if (topics == null || topics.isEmpty() || topics.contains("Random")) {
            availableCases = caseRepository.findAll();
        } else {
            availableCases = caseRepository.findByCategoryNameIn(topics);
        }

        if (availableCases.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Case randomCase = availableCases.get((int) (Math.random() * availableCases.size()));
        return ResponseEntity.ok(randomCase);
    }

    @PostMapping
    public ResponseEntity<Case> createCase(@RequestBody Case case_) {
        Case savedCase = caseRepository.save(case_);
        return ResponseEntity.ok(savedCase);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Case> updateCase(@PathVariable Long id, @RequestBody Case caseDetails) {
        return caseRepository.findById(id)
                .map(case_ -> {
                    case_.setTitle(caseDetails.getTitle());
                    case_.setDescription(caseDetails.getDescription());
                    case_.setCategory(caseDetails.getCategory());
                    case_.setScenario(caseDetails.getScenario());
                    case_.setDoctorRole(caseDetails.getDoctorRole());
                    case_.setPatientRole(caseDetails.getPatientRole());
                    case_.setObserverNotes(caseDetails.getObserverNotes());
                    case_.setLearningObjectives(caseDetails.getLearningObjectives());
                    case_.setDifficulty(caseDetails.getDifficulty());
                    case_.setDuration(caseDetails.getDuration());
                    case_.setDoctorNotes(caseDetails.getDoctorNotes());
                    case_.setPatientNotes(caseDetails.getPatientNotes());
                    return ResponseEntity.ok(caseRepository.save(case_));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCase(@PathVariable Long id) {
        return caseRepository.findById(id)
                .map(case_ -> {
                    caseRepository.delete(case_);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}