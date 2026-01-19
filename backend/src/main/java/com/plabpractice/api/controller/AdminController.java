package com.plabpractice.api.controller;

import com.plabpractice.api.model.User;
import com.plabpractice.api.repository.SessionRepository;
import com.plabpractice.api.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:3001", "http://localhost:5173" })
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SessionRepository sessionRepository;

    @GetMapping("/users")
    public ResponseEntity<?> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String search) {
        try {
            // Validate and map sort field
            String sortField = switch (sortBy) {
                case "name" -> "name";
                case "email" -> "email";
                case "role" -> "role";
                case "createdAt" -> "createdAt";
                default -> "createdAt";
            };

            Sort sort = sortDir.equalsIgnoreCase("desc") 
                ? Sort.by(sortField).descending() 
                : Sort.by(sortField).ascending();
            
            Pageable pageable = PageRequest.of(page, size, sort);

            Page<User> userPage;
            
            if ((role == null || role.isEmpty()) && (search == null || search.isEmpty())) {
                // No filters
                userPage = userRepository.findAll(pageable);
            } else if (role != null && !role.isEmpty() && (search == null || search.isEmpty())) {
                // Role filter only
                try {
                    User.Role roleEnum = User.Role.valueOf(role.toUpperCase());
                    userPage = userRepository.findByRole(roleEnum, pageable);
                } catch (IllegalArgumentException e) {
                    userPage = userRepository.findAll(pageable);
                }
            } else if ((role == null || role.isEmpty()) && search != null && !search.isEmpty()) {
                // Search only
                userPage = userRepository.findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(
                    search, search, pageable);
            } else {
                // Both filters
                try {
                    User.Role roleEnum = User.Role.valueOf(role.toUpperCase());
                    userPage = userRepository.findByRoleAndNameContainingIgnoreCaseOrRoleAndEmailContainingIgnoreCase(
                        roleEnum, search, roleEnum, search, pageable);
                } catch (IllegalArgumentException e) {
                    userPage = userRepository.findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(
                        search, search, pageable);
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("users", userPage.getContent());
            response.put("currentPage", page);
            response.put("totalItems", userPage.getTotalElements());
            response.put("totalPages", userPage.getTotalPages());
            response.put("pageSize", size);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch users: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/users/stats")
    public ResponseEntity<?> getUserStats() {
        try {
            long totalUsers = userRepository.count();
            long adminCount = userRepository.countByRole(User.Role.ADMIN);
            long userCount = userRepository.countByRole(User.Role.USER);

            Map<String, Object> stats = new HashMap<>();
            stats.put("totalUsers", totalUsers);
            stats.put("adminCount", adminCount);
            stats.put("userCount", userCount);

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch user statistics");
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PutMapping("/users/{userId}/role")
    public ResponseEntity<?> updateUserRole(@PathVariable Long userId,
            @Valid @RequestBody UpdateUserRoleRequest request) {
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Prevent removing the last admin
            if (user.getRole() == User.Role.ADMIN && request.getRole() == User.Role.USER) {
                long adminCount = userRepository.countByRole(User.Role.ADMIN);
                if (adminCount <= 1) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("error", "Cannot remove the last admin user");
                    return ResponseEntity.badRequest().body(errorResponse);
                }
            }

            user.setRole(request.getRole());
            userRepository.save(user);

            Map<String, Object> response = new HashMap<>();
            response.put("user", user);
            response.put("message", "User role updated successfully");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to update user role: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @DeleteMapping("/users/{userId}")
    @Transactional
    public ResponseEntity<?> deleteUser(@PathVariable Long userId) {
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Prevent deleting the last admin
            if (user.getRole() == User.Role.ADMIN) {
                long adminCount = userRepository.countByRole(User.Role.ADMIN);
                if (adminCount <= 1) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("error", "Cannot delete the last admin user");
                    return ResponseEntity.badRequest().body(errorResponse);
                }
            }

            // Clear session creator references before deleting user
            // This sets created_by to NULL for sessions created by this user
            sessionRepository.clearCreatorByUserId(userId);

            // Now delete the user (cascade will handle SessionParticipant and Feedback)
            userRepository.delete(user);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "User deleted successfully");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to delete user: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<?> getUser(@PathVariable Long userId) {
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Map<String, Object> response = new HashMap<>();
            response.put("user", user);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch user: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/fix-admin-provider")
    public ResponseEntity<?> fixAdminProvider() {
        try {
            // Find admin user by email
            User adminUser = userRepository.findByEmail("admin@plab.com").orElse(null);

            if (adminUser != null && adminUser.getRole() == User.Role.ADMIN) {
                // Reset admin user to LOCAL provider and remove Google ID
                adminUser.setProvider(User.AuthProvider.LOCAL);
                adminUser.setGoogleId(null);
                userRepository.save(adminUser);

                Map<String, Object> response = new HashMap<>();
                response.put("message", "Admin user provider fixed successfully");
                response.put("user", adminUser);
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Admin user not found");
                return ResponseEntity.badRequest().body(errorResponse);
            }
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fix admin provider: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    // Request DTOs
    public static class UpdateUserRoleRequest {
        @jakarta.validation.constraints.NotNull(message = "Role is required")
        private User.Role role;

        public User.Role getRole() {
            return role;
        }

        public void setRole(User.Role role) {
            this.role = role;
        }
    }
}