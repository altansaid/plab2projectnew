package com.plabpractice.api.controller;

import com.plabpractice.api.model.User;
import com.plabpractice.api.repository.UserRepository;
import com.plabpractice.api.security.SupabaseJwtTokenProvider;
import com.plabpractice.api.service.UserSyncService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = { "${cors.allowed-origins}" })
public class UserSyncController {

    private static final Logger logger = LoggerFactory.getLogger(UserSyncController.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserSyncService userSyncService;

    @Autowired
    private SupabaseJwtTokenProvider supabaseJwtTokenProvider;

    @PostMapping("/sync-supabase-user")
    public ResponseEntity<?> syncSupabaseUser(
            @RequestHeader("Authorization") String authHeader,
            Authentication authentication) {

        try {
            // Extract JWT token from Authorization header
            String token = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }

            if (token == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "No token provided"));
            }

            // Validate that it's a valid Supabase token
            if (!supabaseJwtTokenProvider.validateSupabaseToken(token)) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Invalid Supabase token"));
            }

            String supabaseUserId = supabaseJwtTokenProvider.getUserIdFromSupabaseToken(token);
            String email = supabaseJwtTokenProvider.getEmailFromSupabaseToken(token);

            if (supabaseUserId == null || email == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Invalid token data"));
            }

            // Find or create user
            Optional<User> userOpt = userRepository.findBySupabaseId(supabaseUserId);

            User user;
            boolean isNewUser = false;

            if (userOpt.isEmpty()) {
                // Check if user exists by email
                userOpt = userRepository.findByEmail(email);

                if (userOpt.isPresent()) {
                    // Link existing user to Supabase
                    user = userOpt.get();
                    user = userSyncService.syncSupabaseUser(user, token);
                } else {
                    // Create new user
                    user = userSyncService.createUserFromSupabaseToken(token);
                    isNewUser = true;

                    if (user == null) {
                        return ResponseEntity.badRequest().body(Map.of(
                                "error", "Failed to create user"));
                    }
                }
            } else {
                // Update existing Supabase user
                user = userOpt.get();
                user = userSyncService.updateUserFromSupabaseToken(user, token);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("user", user);
            response.put("isNewUser", isNewUser);
            response.put("message", isNewUser ? "User created successfully" : "User synced successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error syncing Supabase user", e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Internal server error during user sync"));
        }
    }

    @GetMapping("/user-profile")
    public ResponseEntity<?> getUserProfile(Authentication authentication) {
        try {
            if (authentication == null) {
                return ResponseEntity.status(401).body(Map.of(
                        "error", "Not authenticated"));
            }

            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String email = userDetails.getUsername();

            Optional<User> userOpt = userRepository.findByEmail(email);

            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of(
                        "error", "User not found"));
            }

            User user = userOpt.get();
            Map<String, Object> response = new HashMap<>();
            response.put("user", user);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error getting user profile", e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Internal server error"));
        }
    }
}