package com.plabpractice.api.controller;

import com.plabpractice.api.model.Case;
import com.plabpractice.api.model.Category;
import com.plabpractice.api.model.Session;
import com.plabpractice.api.repository.CaseRepository;
import com.plabpractice.api.repository.CategoryRepository;
import com.plabpractice.api.repository.SessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/cases")
@CrossOrigin(origins = {
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "https://plab2projectnew.vercel.app"
})
public class CaseController {

    @Autowired
    private CaseRepository caseRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private SessionRepository sessionRepository;

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
                    case_.setImageUrl(caseDetails.getImageUrl());
                    case_.setSections(caseDetails.getSections());
                    case_.setFeedbackCriteria(caseDetails.getFeedbackCriteria());
                    return ResponseEntity.ok(caseRepository.save(case_));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCase(@PathVariable Long id) {
        return caseRepository.findById(id)
                .map(case_ -> {
                    // Check if case is referenced by any ACTIVE sessions
                    List<Session> relatedSessions = sessionRepository.findBySelectedCaseId(id);

                    // Filter only active sessions (not completed or cancelled)
                    List<Session> activeSessions = relatedSessions.stream()
                            .filter(session -> session.getStatus() == Session.Status.CREATED ||
                                    session.getStatus() == Session.Status.IN_PROGRESS)
                            .toList();

                    if (!activeSessions.isEmpty()) {
                        Map<String, Object> errorResponse = new HashMap<>();
                        errorResponse.put("error", "Cannot delete case because it is being used in " +
                                activeSessions.size() + " active session(s). " +
                                "Please wait for sessions to complete or cancel them first.");
                        errorResponse.put("activeSessionCount", activeSessions.size());
                        errorResponse.put("totalSessionCount", relatedSessions.size());
                        return ResponseEntity.badRequest().body(errorResponse);
                    }

                    // If there are only completed/cancelled sessions, set their case_id to NULL
                    List<Session> completedSessions = relatedSessions.stream()
                            .filter(session -> session.getStatus() == Session.Status.COMPLETED ||
                                    session.getStatus() == Session.Status.CANCELLED)
                            .toList();

                    if (!completedSessions.isEmpty()) {
                        // Set case_id to NULL for completed sessions
                        completedSessions.forEach(session -> {
                            session.setSelectedCase(null);
                            sessionRepository.save(session);
                        });
                    }

                    caseRepository.delete(case_);

                    Map<String, Object> successResponse = new HashMap<>();
                    successResponse.put("message", "Case deleted successfully");
                    if (!completedSessions.isEmpty()) {
                        successResponse.put("info", "Removed case reference from " +
                                completedSessions.size() + " completed session(s)");
                    }
                    return ResponseEntity.ok(successResponse);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}