package com.plabpractice.api.controller;

import com.plabpractice.api.model.User;
import com.plabpractice.api.repository.SessionRepository;
import com.plabpractice.api.repository.UserRepository;
import com.plabpractice.api.service.SupabaseAuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:3001", "http://localhost:5173" })
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private SupabaseAuthService supabaseAuthService;

    /**
     * Get all users - merges Supabase Auth users with local database users.
     * Supabase users that haven't logged in yet will still appear.
     */
    @GetMapping("/users")
    public ResponseEntity<?> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String search) {
        try {
            // Get all local users
            List<User> localUsers = userRepository.findAll();
            
            // Get all Supabase users
            List<Map<String, Object>> supabaseUsers = supabaseAuthService.getAllSupabaseUsers();
            
            // Create a map of local users by email for quick lookup
            Map<String, User> localUsersByEmail = localUsers.stream()
                    .collect(Collectors.toMap(User::getEmail, u -> u, (u1, u2) -> u1));
            
            // Create a map of local users by supabaseId for quick lookup
            Map<String, User> localUsersBySupabaseId = localUsers.stream()
                    .filter(u -> u.getSupabaseId() != null)
                    .collect(Collectors.toMap(User::getSupabaseId, u -> u, (u1, u2) -> u1));
            
            // Track which emails we've already processed
            Set<String> processedEmails = new HashSet<>();
            
            // Build merged user list
            List<Map<String, Object>> mergedUsers = new ArrayList<>();
            
            // First, add all Supabase users (they take precedence for showing new users)
            for (Map<String, Object> supabaseUser : supabaseUsers) {
                String email = (String) supabaseUser.get("email");
                String supabaseId = (String) supabaseUser.get("supabaseId");
                
                if (email == null) continue;
                
                // Check if this user exists in local DB
                User localUser = localUsersByEmail.get(email);
                if (localUser == null && supabaseId != null) {
                    localUser = localUsersBySupabaseId.get(supabaseId);
                }
                
                Map<String, Object> userMap = new HashMap<>();
                if (localUser != null) {
                    // User exists in both - use local data (has ID, role, etc.)
                    userMap.put("id", localUser.getId());
                    userMap.put("name", localUser.getName());
                    userMap.put("email", localUser.getEmail());
                    userMap.put("role", localUser.getRole().name());
                    userMap.put("provider", localUser.getProvider() != null ? localUser.getProvider().name() : supabaseUser.get("provider"));
                    userMap.put("createdAt", localUser.getCreatedAt() != null ? localUser.getCreatedAt().toString() : supabaseUser.get("createdAt"));
                    userMap.put("supabaseId", supabaseId);
                    userMap.put("synced", true);
                } else {
                    // User only in Supabase - show with temporary ID
                    userMap.put("id", -1); // Temporary ID for unsynced users
                    userMap.put("name", supabaseUser.get("name"));
                    userMap.put("email", email);
                    userMap.put("role", "USER"); // Default role for new users
                    userMap.put("provider", supabaseUser.get("provider"));
                    userMap.put("createdAt", supabaseUser.get("createdAt"));
                    userMap.put("supabaseId", supabaseId);
                    userMap.put("synced", false);
                    userMap.put("emailConfirmed", supabaseUser.get("emailConfirmed"));
                }
                
                mergedUsers.add(userMap);
                processedEmails.add(email);
            }
            
            // Add any local users not in Supabase (legacy users)
            for (User localUser : localUsers) {
                if (!processedEmails.contains(localUser.getEmail())) {
                    Map<String, Object> userMap = new HashMap<>();
                    userMap.put("id", localUser.getId());
                    userMap.put("name", localUser.getName());
                    userMap.put("email", localUser.getEmail());
                    userMap.put("role", localUser.getRole().name());
                    userMap.put("provider", localUser.getProvider() != null ? localUser.getProvider().name() : "LOCAL");
                    userMap.put("createdAt", localUser.getCreatedAt() != null ? localUser.getCreatedAt().toString() : null);
                    userMap.put("supabaseId", localUser.getSupabaseId());
                    userMap.put("synced", localUser.getSupabaseId() != null);
                    mergedUsers.add(userMap);
                }
            }
            
            // Apply filters
            List<Map<String, Object>> filteredUsers = mergedUsers;
            
            // Role filter
            if (role != null && !role.isEmpty()) {
                final String roleUpper = role.toUpperCase();
                filteredUsers = filteredUsers.stream()
                        .filter(u -> roleUpper.equals(u.get("role")))
                        .collect(Collectors.toList());
            }
            
            // Search filter
            if (search != null && !search.isEmpty()) {
                final String searchLower = search.toLowerCase();
                filteredUsers = filteredUsers.stream()
                        .filter(u -> {
                            String name = (String) u.get("name");
                            String email = (String) u.get("email");
                            return (name != null && name.toLowerCase().contains(searchLower)) ||
                                   (email != null && email.toLowerCase().contains(searchLower));
                        })
                        .collect(Collectors.toList());
            }
            
            // Sort
            Comparator<Map<String, Object>> comparator;
            switch (sortBy) {
                case "name":
                    comparator = Comparator.comparing(u -> (String) u.get("name"), Comparator.nullsLast(String::compareToIgnoreCase));
                    break;
                case "email":
                    comparator = Comparator.comparing(u -> (String) u.get("email"), Comparator.nullsLast(String::compareToIgnoreCase));
                    break;
                case "role":
                    comparator = Comparator.comparing(u -> (String) u.get("role"), Comparator.nullsLast(String::compareToIgnoreCase));
                    break;
                default: // createdAt
                    comparator = Comparator.comparing(u -> (String) u.get("createdAt"), Comparator.nullsLast(String::compareTo));
                    break;
            }
            
            if ("desc".equalsIgnoreCase(sortDir)) {
                comparator = comparator.reversed();
            }
            
            filteredUsers.sort(comparator);
            
            // Paginate
            int totalItems = filteredUsers.size();
            int totalPages = (int) Math.ceil((double) totalItems / size);
            int fromIndex = Math.min(page * size, totalItems);
            int toIndex = Math.min(fromIndex + size, totalItems);
            
            List<Map<String, Object>> pagedUsers = filteredUsers.subList(fromIndex, toIndex);
            
            Map<String, Object> response = new HashMap<>();
            response.put("users", pagedUsers);
            response.put("currentPage", page);
            response.put("totalItems", totalItems);
            response.put("totalPages", totalPages);
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
            // Get local database counts
            long localAdminCount = userRepository.countByRole(User.Role.ADMIN);
            
            // Get Supabase users count
            List<Map<String, Object>> supabaseUsers = supabaseAuthService.getAllSupabaseUsers();
            List<User> localUsers = userRepository.findAll();
            
            // Count unique users (Supabase + local users not in Supabase)
            Set<String> supabaseEmails = supabaseUsers.stream()
                    .map(u -> (String) u.get("email"))
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            
            long localOnlyUsers = localUsers.stream()
                    .filter(u -> !supabaseEmails.contains(u.getEmail()))
                    .count();
            
            long totalUsers = supabaseUsers.size() + localOnlyUsers;

            Map<String, Object> stats = new HashMap<>();
            stats.put("totalUsers", totalUsers);
            stats.put("adminCount", localAdminCount); // Admins are only in local DB
            stats.put("userCount", totalUsers - localAdminCount);
            stats.put("supabaseUsers", supabaseUsers.size());
            stats.put("syncedUsers", localUsers.stream().filter(u -> u.getSupabaseId() != null).count());

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