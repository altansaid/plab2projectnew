package com.plabpractice.api.controller;

import com.plabpractice.api.model.User;
import com.plabpractice.api.repository.UserRepository;
import com.plabpractice.api.security.JwtTokenProvider;
import com.plabpractice.api.service.EmailService;
import com.plabpractice.api.service.GoogleTokenVerifier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:3001", "http://localhost:5173" })
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private EmailService emailService;

    @Autowired
    private GoogleTokenVerifier googleTokenVerifier;

    @GetMapping("/ping")
    public ResponseEntity<Map<String, Object>> ping() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "OK");
        response.put("message", "PLAB Practice API is running");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@jakarta.validation.Valid @RequestBody LoginRequest loginRequest) {
        try {
            // Authenticate user with Spring Security (single password verification)
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getEmail(),
                            loginRequest.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = tokenProvider.generateToken(authentication);

            // Get user details after successful authentication
            User user = userRepository.findByEmail(loginRequest.getEmail())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Map<String, Object> response = new HashMap<>();
            response.put("token", jwt);
            response.put("user", user);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Invalid email or password");
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@jakarta.validation.Valid @RequestBody RegisterRequest registerRequest) {
        try {
            if (userRepository.existsByEmail(registerRequest.getEmail())) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Email is already taken");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            User user = new User();
            user.setName(registerRequest.getName());
            user.setEmail(registerRequest.getEmail());
            user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
            user.setRole(User.Role.USER);
            user.setProvider(User.AuthProvider.LOCAL);

            userRepository.save(user);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "User registered successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Registration failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/google")
    public ResponseEntity<?> authenticateWithGoogle(@Valid @RequestBody GoogleAuthRequest request) {
        try {
            Map<String, Object> payload = googleTokenVerifier.verify(request.getIdToken());

            String email = (String) payload.get("email");
            String name = (String) payload.get("name");
            String googleId = (String) payload.get("sub");

            User user = userRepository.findByEmail(email).orElse(null);

            if (user == null) {
                // Create new user
                user = new User();
                user.setName(name);
                user.setEmail(email);
                user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString())); // Random password for OAuth
                                                                                        // users
                user.setRole(User.Role.USER);
                user.setGoogleId(googleId);
                user.setProvider(User.AuthProvider.GOOGLE);
                userRepository.save(user);
            } else {
                // For existing users, link Google account if they don't have a Google ID yet
                if (user.getGoogleId() == null) {
                    // Link existing account to Google
                    user.setGoogleId(googleId);
                    user.setProvider(User.AuthProvider.GOOGLE);
                    userRepository.save(user);
                }
            }

            // Generate JWT token with proper UserDetails
            UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                    .username(user.getEmail())
                    .password(user.getPassword())
                    .authorities("ROLE_" + user.getRole().name())
                    .build();

            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());

            String jwt = tokenProvider.generateToken(authentication);

            Map<String, Object> response = new HashMap<>();
            response.put("token", jwt);
            response.put("user", user);

            return ResponseEntity.ok(response);
        } catch (SecurityException e) {
            // Token verification failed - return 401 Unauthorized
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Invalid or expired Google ID token");
            errorResponse.put("details", e.getMessage());
            return ResponseEntity.status(401).body(errorResponse);
        } catch (IllegalStateException e) {
            // Configuration error - return 500 Internal Server Error
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Google OAuth configuration error");
            return ResponseEntity.status(500).body(errorResponse);
        } catch (Exception e) {
            // Other errors - return 400 Bad Request
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Google authentication failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @org.springframework.beans.factory.annotation.Value("${auth.reset-token.minutes:15}")
    private int resetTokenMinutes;

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        try {
            User user = userRepository.findByEmail(request.getEmail()).orElse(null);

            if (user != null) {
                // Generate reset token
                String resetToken = UUID.randomUUID().toString();
                user.setResetToken(resetToken);
                user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(resetTokenMinutes));
                userRepository.save(user);

                // Send reset email
                emailService.sendPasswordResetEmail(user.getEmail(), resetToken);
            }

            // Always return success to prevent email enumeration
            Map<String, Object> response = new HashMap<>();
            response.put("message", "If the email exists, a password reset link has been sent");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to process password reset request");
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            User user = userRepository.findByResetToken(request.getToken()).orElse(null);

            if (user == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Invalid reset token");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            if (!user.isResetTokenValid()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Reset token has expired. Please request a new one.");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // Update password and clear reset token
            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
            user.clearResetToken();
            userRepository.save(user);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Password reset successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to reset password");
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Map<String, Object> response = new HashMap<>();
            response.put("user", user);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch profile");
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@Valid @RequestBody UpdateProfileRequest request,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            user.setName(request.getName());
            userRepository.save(user);

            Map<String, Object> response = new HashMap<>();
            response.put("user", user);
            response.put("message", "Profile updated successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to update profile");
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Verify current password for local auth users
            if (user.getProvider() == User.AuthProvider.LOCAL &&
                    !passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Current password is incorrect");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // Update password
            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
            userRepository.save(user);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Password changed successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to change password");
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    // Test endpoint to check Google OAuth configuration
    @GetMapping("/test-google-config")
    public ResponseEntity<?> testGoogleConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("googleOAuthEnabled", googleTokenVerifier.isGoogleOAuthEnabled());
        config.put("hasGoogleClientId", googleTokenVerifier.getGoogleClientId() != null
                && !googleTokenVerifier.getGoogleClientId().trim().isEmpty());
        config.put("googleClientIdPrefix",
                googleTokenVerifier.getGoogleClientId() != null
                        ? googleTokenVerifier.getGoogleClientId().substring(0,
                                Math.min(10, googleTokenVerifier.getGoogleClientId().length())) + "..."
                        : "not set");
        return ResponseEntity.ok(config);
    }

    // Request DTOs
    public static class LoginRequest {
        @jakarta.validation.constraints.NotBlank(message = "Email is required")
        @jakarta.validation.constraints.Email(message = "Email should be valid")
        private String email;

        @jakarta.validation.constraints.NotBlank(message = "Password is required")
        private String password;

        // Getters and setters
        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }

    public static class RegisterRequest {
        @jakarta.validation.constraints.NotBlank(message = "Name is required")
        private String name;

        @jakarta.validation.constraints.NotBlank(message = "Email is required")
        @jakarta.validation.constraints.Email(message = "Email should be valid")
        private String email;

        @jakarta.validation.constraints.NotBlank(message = "Password is required")
        @jakarta.validation.constraints.Size(min = 6, message = "Password must be at least 6 characters")
        private String password;

        // Getters and setters
        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }

    public static class GoogleAuthRequest {
        @jakarta.validation.constraints.NotBlank(message = "ID token is required")
        private String idToken;

        public String getIdToken() {
            return idToken;
        }

        public void setIdToken(String idToken) {
            this.idToken = idToken;
        }
    }

    public static class ForgotPasswordRequest {
        @jakarta.validation.constraints.NotBlank(message = "Email is required")
        @jakarta.validation.constraints.Email(message = "Email should be valid")
        private String email;

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }
    }

    public static class ResetPasswordRequest {
        @jakarta.validation.constraints.NotBlank(message = "Token is required")
        private String token;

        @jakarta.validation.constraints.NotBlank(message = "New password is required")
        @jakarta.validation.constraints.Size(min = 6, message = "Password must be at least 6 characters")
        private String newPassword;

        public String getToken() {
            return token;
        }

        public void setToken(String token) {
            this.token = token;
        }

        public String getNewPassword() {
            return newPassword;
        }

        public void setNewPassword(String newPassword) {
            this.newPassword = newPassword;
        }
    }

    public static class UpdateProfileRequest {
        @jakarta.validation.constraints.NotBlank(message = "Name is required")
        private String name;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }

    public static class ChangePasswordRequest {
        @jakarta.validation.constraints.NotBlank(message = "Current password is required")
        private String currentPassword;

        @jakarta.validation.constraints.NotBlank(message = "New password is required")
        @jakarta.validation.constraints.Size(min = 6, message = "Password must be at least 6 characters")
        private String newPassword;

        public String getCurrentPassword() {
            return currentPassword;
        }

        public void setCurrentPassword(String currentPassword) {
            this.currentPassword = currentPassword;
        }

        public String getNewPassword() {
            return newPassword;
        }

        public void setNewPassword(String newPassword) {
            this.newPassword = newPassword;
        }
    }
}