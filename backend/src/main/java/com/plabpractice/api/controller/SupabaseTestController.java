package com.plabpractice.api.controller;

import com.plabpractice.api.security.SupabaseJwtTokenProvider;
import io.jsonwebtoken.Claims;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller for testing Supabase JWT token validation.
 * This can be removed in production.
 */
@RestController
@RequestMapping("/api/test")
@CrossOrigin(origins = { "${cors.allowed-origins}" })
public class SupabaseTestController {

    private static final Logger logger = LoggerFactory.getLogger(SupabaseTestController.class);

    @Autowired
    private SupabaseJwtTokenProvider supabaseJwtTokenProvider;

    /**
     * Test endpoint to validate a Supabase JWT token
     */
    @PostMapping("/validate-token")
    public ResponseEntity<?> validateToken(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Invalid Authorization header format"));
            }

            String token = authHeader.substring(7);

            // Validate token
            boolean isValid = supabaseJwtTokenProvider.validateSupabaseToken(token);

            Map<String, Object> response = new HashMap<>();
            response.put("valid", isValid);

            if (isValid) {
                // Extract user information
                String userId = supabaseJwtTokenProvider.getUserIdFromSupabaseToken(token);
                String email = supabaseJwtTokenProvider.getEmailFromSupabaseToken(token);
                String name = supabaseJwtTokenProvider.getUserNameFromSupabaseToken(token);
                Claims claims = supabaseJwtTokenProvider.getClaimsFromSupabaseToken(token);

                response.put("userId", userId);
                response.put("email", email);
                response.put("name", name);
                response.put("issuer", claims != null ? claims.getIssuer() : null);
                response.put("subject", claims != null ? claims.getSubject() : null);
                response.put("expiresAt", claims != null ? claims.getExpiration() : null);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error validating token", e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Internal server error: " + e.getMessage()));
        }
    }

    /**
     * Test endpoint to check Supabase configuration
     */
    @GetMapping("/config")
    public ResponseEntity<?> getConfig() {
        Map<String, Object> config = new HashMap<>();

        // Note: Don't expose sensitive configuration in production
        config.put("message", "Supabase JWT validation is configured");
        config.put("status", "OK");

        return ResponseEntity.ok(config);
    }
}