package com.plabpractice.api.controller;

import com.plabpractice.api.model.Category;
import com.plabpractice.api.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = {
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "https://plab2projectnew.vercel.app"
})
public class CategoryController {

    @Autowired
    private CategoryRepository categoryRepository;

    @GetMapping
    public ResponseEntity<List<Category>> getAllCategories() {
        List<Category> categories = categoryRepository.findAll();
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Category> getCategoryById(@PathVariable Long id) {
        return categoryRepository.findById(id)
                .map(category -> ResponseEntity.ok().body(category))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createCategory(@RequestBody Category category) {
        try {
            // Check if category name already exists
            if (categoryRepository.existsByName(category.getName())) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Category with this name already exists");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            Category savedCategory = categoryRepository.save(category);
            return ResponseEntity.ok(savedCategory);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to create category: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCategory(@PathVariable Long id, @RequestBody Category categoryDetails) {
        try {
            return categoryRepository.findById(id)
                    .map(category -> {
                        // Check if new name conflicts with existing category (excluding current one)
                        if (!category.getName().equals(categoryDetails.getName()) &&
                                categoryRepository.existsByName(categoryDetails.getName())) {
                            Map<String, Object> errorResponse = new HashMap<>();
                            errorResponse.put("error", "Category with this name already exists");
                            return ResponseEntity.badRequest().body(errorResponse);
                        }

                        category.setName(categoryDetails.getName());
                        if (categoryDetails.getDescription() != null) {
                            category.setDescription(categoryDetails.getDescription());
                        }
                        Category savedCategory = categoryRepository.save(category);
                        return ResponseEntity.ok(savedCategory);
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to update category: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCategory(@PathVariable Long id) {
        try {
            return categoryRepository.findById(id)
                    .map(category -> {
                        // Check if category has associated cases
                        if (!category.getCases().isEmpty()) {
                            Map<String, Object> errorResponse = new HashMap<>();
                            errorResponse.put("error", "Cannot delete category because it has " +
                                    category.getCases().size() + " associated case(s). " +
                                    "Please move or delete the cases first.");
                            errorResponse.put("caseCount", category.getCases().size());
                            return ResponseEntity.badRequest().body(errorResponse);
                        }

                        categoryRepository.delete(category);
                        Map<String, Object> successResponse = new HashMap<>();
                        successResponse.put("message", "Category deleted successfully");
                        return ResponseEntity.ok(successResponse);
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to delete category: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/search")
    public ResponseEntity<List<Category>> searchCategories(@RequestParam String name) {
        try {
            // This could be extended to search by partial name matches
            List<Category> categories = categoryRepository.findAll()
                    .stream()
                    .filter(category -> category.getName().toLowerCase().contains(name.toLowerCase()))
                    .toList();
            return ResponseEntity.ok(categories);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}