package com.plabpractice.api.service;

import com.plabpractice.api.model.User;
import com.plabpractice.api.repository.UserRepository;
import com.plabpractice.api.security.SupabaseJwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.UUID;

@Service
public class UserSyncService {

    private static final Logger logger = LoggerFactory.getLogger(UserSyncService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SupabaseJwtTokenProvider supabaseJwtTokenProvider;

    @Autowired
    public UserSyncService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            SupabaseJwtTokenProvider supabaseJwtTokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.supabaseJwtTokenProvider = supabaseJwtTokenProvider;
    }

    /**
     * Creates a new user from a Supabase JWT token
     */
    public User createUserFromSupabaseToken(String token) {
        try {
            String supabaseUserId = supabaseJwtTokenProvider.getUserIdFromSupabaseToken(token);
            String email = supabaseJwtTokenProvider.getEmailFromSupabaseToken(token);
            String name = supabaseJwtTokenProvider.getUserNameFromSupabaseToken(token);

            if (supabaseUserId == null || email == null) {
                logger.warn("Missing required fields in Supabase token");
                return null;
            }

            // Check if user already exists
            if (userRepository.findBySupabaseId(supabaseUserId).isPresent() ||
                    userRepository.findByEmail(email).isPresent()) {
                logger.warn("User already exists with Supabase ID: {} or email: {}", supabaseUserId, email);
                return null;
            }

            // Use name from token or extract from email as fallback
            if (name == null || name.trim().isEmpty()) {
                name = extractNameFromEmail(email);
            }

            // Create new user
            User user = new User();
            user.setSupabaseId(supabaseUserId);
            user.setEmail(email);
            user.setName(name);
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString())); // Random password
            user.setRole(User.Role.USER); // Default role
            user.setProvider(User.AuthProvider.SUPABASE);

            user = userRepository.save(user);
            logger.info("Created new user from Supabase token: {} with name: {}", email, name);

            return user;

        } catch (Exception e) {
            logger.error("Error creating user from Supabase token", e);
            return null;
        }
    }

    /**
     * Syncs a Supabase user with an existing local user
     */
    public User syncSupabaseUser(User existingUser, String token) {
        try {
            String supabaseUserId = supabaseJwtTokenProvider.getUserIdFromSupabaseToken(token);

            if (supabaseUserId != null && existingUser.getSupabaseId() == null) {
                existingUser.setSupabaseId(supabaseUserId);
                existingUser.setProvider(User.AuthProvider.SUPABASE);

                return userRepository.save(existingUser);
            }

            return existingUser;

        } catch (Exception e) {
            logger.error("Error syncing Supabase user", e);
            return existingUser;
        }
    }

    /**
     * Updates user information from Supabase token if needed
     */
    public User updateUserFromSupabaseToken(User user, String token) {
        try {
            String email = supabaseJwtTokenProvider.getEmailFromSupabaseToken(token);
            String name = supabaseJwtTokenProvider.getUserNameFromSupabaseToken(token);

            boolean updated = false;

            // Update email if different
            if (email != null && !email.equals(user.getEmail())) {
                // Check if email is already taken by another user
                if (userRepository.findByEmail(email).isEmpty()) {
                    user.setEmail(email);
                    updated = true;
                }
            }

            // Update name if provided and different
            if (name != null && !name.trim().isEmpty() && !name.equals(user.getName())) {
                user.setName(name);
                updated = true;
            }

            if (updated) {
                logger.debug("Updated user information for: {}", user.getEmail());
                return userRepository.save(user);
            }

            return user;

        } catch (Exception e) {
            logger.error("Error updating user from Supabase token", e);
            return user;
        }
    }

    private String extractNameFromEmail(String email) {
        if (email == null) {
            return "User";
        }

        // Extract the part before @ and capitalize
        String[] parts = email.split("@");
        if (parts.length > 0) {
            String localPart = parts[0];
            // Replace dots and underscores with spaces, capitalize first letter
            return localPart.replace(".", " ")
                    .replace("_", " ")
                    .trim();
        }

        return "User";
    }
}