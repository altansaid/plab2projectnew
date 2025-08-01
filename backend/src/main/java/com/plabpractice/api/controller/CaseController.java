package com.plabpractice.api.controller;

import com.plabpractice.api.model.Case;
import com.plabpractice.api.model.Category;
import com.plabpractice.api.model.Session;
import com.plabpractice.api.repository.CaseRepository;
import com.plabpractice.api.repository.CategoryRepository;
import com.plabpractice.api.repository.SessionRepository;
import com.plabpractice.api.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

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

    // Recall-specific endpoints
    @GetMapping("/recall")
    public ResponseEntity<List<Case>> getAllRecallCases() {
        List<Case> recallCases = caseRepository.findByIsRecallCaseTrue();
        System.out.println("📊 Debug: getAllRecallCases called");
        System.out.println("   Found " + recallCases.size() + " recall cases");
        for (Case c : recallCases) {
            System.out.println("   Case " + c.getId() + ": " + c.getTitle() + " - Recall dates: " + c.getRecallDates());
        }
        return ResponseEntity.ok(recallCases);
    }

    @GetMapping("/recall/dates")
    @Cacheable(value = "recallDates", unless = "#result.body == null || #result.body.isEmpty()")
    public ResponseEntity<List<String>> getAllRecallDates() {
        List<Case> recallCases = caseRepository.findByIsRecallCaseTrue();
        List<String> dates = recallCases.stream()
                .filter(c -> c.getRecallDates() != null)
                .flatMap(c -> c.getRecallDates().stream())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
        return ResponseEntity.ok(dates);
    }

    @GetMapping("/recall/by-date")
    public ResponseEntity<List<Case>> getRecallCasesByDate(@RequestParam String date) {
        List<Case> recallCases = caseRepository.findByIsRecallCaseTrue();
        List<Case> filteredCases = recallCases.stream()
                .filter(c -> c.getRecallDates() != null && c.getRecallDates().contains(date))
                .collect(Collectors.toList());
        return ResponseEntity.ok(filteredCases);
    }

    @GetMapping("/recall/by-date-range")
    public ResponseEntity<List<Case>> getRecallCasesByDateRange(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        System.out.println("🔍 Recall date range query: " + startDate + " to " + endDate);

        List<Case> recallCases = caseRepository.findByIsRecallCaseTrue();
        System.out.println("📊 Total recall cases found: " + recallCases.size());

        // Debug: Print all recall cases and their dates
        for (Case c : recallCases) {
            System.out
                    .println("📝 Case " + c.getId() + " (" + c.getTitle() + ") - Recall dates: " + c.getRecallDates());
        }

        List<Case> filteredCases = recallCases.stream()
                .filter(c -> {
                    if (c.getRecallDates() == null || c.getRecallDates().isEmpty()) {
                        return false;
                    }

                    boolean hasDateInRange = c.getRecallDates().stream().anyMatch(date -> {
                        boolean inRange = date.compareTo(startDate) >= 0 && date.compareTo(endDate) <= 0;
                        System.out.println("🔍 Checking date " + date + " against range [" + startDate + ", " + endDate
                                + "] = " + inRange);
                        return inRange;
                    });

                    System.out.println("📋 Case " + c.getId() + " has dates in range: " + hasDateInRange);
                    return hasDateInRange;
                })
                .collect(Collectors.toList());

        System.out.println("✅ Filtered cases count: " + filteredCases.size());
        return ResponseEntity.ok(filteredCases);
    }

    @GetMapping("/recall/random")
    public ResponseEntity<Case> getRandomRecallCase(@RequestParam String date) {
        List<Case> recallCases = caseRepository.findByIsRecallCaseTrue();
        List<Case> availableCases = recallCases.stream()
                .filter(c -> c.getRecallDates() != null && c.getRecallDates().contains(date))
                .collect(Collectors.toList());

        if (availableCases.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Case randomCase = availableCases.get((int) (Math.random() * availableCases.size()));
        return ResponseEntity.ok(randomCase);
    }

    @GetMapping("/recall/random-from-range")
    public ResponseEntity<Case> getRandomRecallCaseFromRange(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false) List<Long> excludeCaseIds) {
        List<Case> recallCases = caseRepository.findByIsRecallCaseTrue();
        List<Case> availableCases = recallCases.stream()
                .filter(c -> c.getRecallDates() != null &&
                        c.getRecallDates().stream()
                                .anyMatch(date -> date.compareTo(startDate) >= 0 && date.compareTo(endDate) <= 0))
                .filter(c -> excludeCaseIds == null || !excludeCaseIds.contains(c.getId()))
                .collect(Collectors.toList());

        if (availableCases.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Case randomCase = availableCases.get((int) (Math.random() * availableCases.size()));
        return ResponseEntity.ok(randomCase);
    }

    // Debug endpoint to test date filtering
    @GetMapping("/recall/debug-dates")
    public ResponseEntity<Map<String, Object>> debugRecallDates(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        Map<String, Object> debug = new HashMap<>();
        debug.put("queryStartDate", startDate);
        debug.put("queryEndDate", endDate);

        List<Case> allRecallCases = caseRepository.findByIsRecallCaseTrue();
        debug.put("totalRecallCases", allRecallCases.size());

        List<Map<String, Object>> caseDetails = allRecallCases.stream().map(c -> {
            Map<String, Object> caseInfo = new HashMap<>();
            caseInfo.put("id", c.getId());
            caseInfo.put("title", c.getTitle());
            caseInfo.put("isRecallCase", c.getIsRecallCase());
            caseInfo.put("recallDates", c.getRecallDates());

            if (startDate != null && endDate != null && c.getRecallDates() != null) {
                boolean hasDateInRange = c.getRecallDates().stream()
                        .anyMatch(date -> date.compareTo(startDate) >= 0 && date.compareTo(endDate) <= 0);
                caseInfo.put("hasDateInRange", hasDateInRange);
            }

            return caseInfo;
        }).collect(Collectors.toList());

        debug.put("cases", caseDetails);
        return ResponseEntity.ok(debug);
    }

    @PostMapping
    // @PreAuthorize("hasRole('ADMIN')") // Temporarily disabled for testing
    @CacheEvict(value = { "recallDates" }, allEntries = true)
    public Case createCase(@RequestBody Case caseData) {
        Category category = categoryRepository.findById(caseData.getCategory().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        caseData.setCategory(category);

        // Handle visual data and maintain backward compatibility
        handleVisualData(caseData);

        return caseRepository.save(caseData);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = { "recallDates" }, allEntries = true)
    public Case updateCase(@PathVariable Long id, @RequestBody Case caseData) {
        Case existingCase = caseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Case not found"));

        Category category = categoryRepository.findById(caseData.getCategory().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        existingCase.setCategory(category);
        existingCase.setTitle(caseData.getTitle());
        existingCase.setDescription(caseData.getDescription());
        existingCase.setDoctorInstructions(caseData.getDoctorInstructions());
        existingCase.setPatientInstructions(caseData.getPatientInstructions());
        existingCase.setObserverInstructions(caseData.getObserverInstructions());
        existingCase.setDoctorSections(caseData.getDoctorSections());
        existingCase.setPatientSections(caseData.getPatientSections());
        existingCase.setDoctorNotes(caseData.getDoctorNotes());
        existingCase.setPatientNotes(caseData.getPatientNotes());
        existingCase.setImageUrl(caseData.getImageUrl());
        existingCase.setVisualData(caseData.getVisualData());
        existingCase.setFeedbackCriteria(caseData.getFeedbackCriteria());
        existingCase.setIsRecallCase(caseData.getIsRecallCase());
        existingCase.setRecallDates(caseData.getRecallDates());

        // Handle visual data and maintain backward compatibility
        handleVisualData(existingCase);

        return caseRepository.save(existingCase);
    }

    /**
     * Helper method to handle visual data and maintain backward compatibility with
     * imageUrl
     */
    private void handleVisualData(Case caseData) {
        // If visualData is provided, use it and update imageUrl for backward
        // compatibility
        if (caseData.getVisualData() != null) {
            Case.VisualData visualData = caseData.getVisualData();

            // If it's an image type, also set the imageUrl field for backward compatibility
            if ("image".equals(visualData.getType()) && visualData.getContent() != null) {
                caseData.setImageUrl(visualData.getContent());
            } else if ("text".equals(visualData.getType())) {
                // For text type, clear the imageUrl
                caseData.setImageUrl(null);
            }
        } else if (caseData.getImageUrl() != null) {
            // If only imageUrl is provided (backward compatibility), create visualData
            caseData.setVisualData(new Case.VisualData("image", caseData.getImageUrl()));
        }
    }

    @DeleteMapping("/{id}")
    @CacheEvict(value = { "recallDates" }, allEntries = true)
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