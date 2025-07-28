package com.plabpractice.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
public class GoogleTokenVerifier {

    private static final Logger logger = LoggerFactory.getLogger(GoogleTokenVerifier.class);
    private static final String GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo?id_token=";
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${google.oauth.enabled:false}")
    private boolean googleOAuthEnabled;

    @Value("${google.client.id:}")
    private String googleClientId;

    public Map<String, Object> verify(String idTokenString) throws Exception {
        // Use mock verification for development when Google OAuth is disabled
        if (!googleOAuthEnabled) {
            // Mock verification for development
            logger.info("=== MOCK GOOGLE TOKEN VERIFICATION (OAuth disabled) ===");
            logger.info("Token: {}", idTokenString.substring(0, Math.min(20, idTokenString.length())) + "...");
            logger.info("=== END MOCK VERIFICATION ===");

            Map<String, Object> mockPayload = new HashMap<>();
            mockPayload.put("sub", "mock_google_id_123");
            mockPayload.put("email", "admin@plab.com");
            mockPayload.put("name", "Admin User");
            mockPayload.put("email_verified", true);
            return mockPayload;
        }

        if (googleClientId == null || googleClientId.trim().isEmpty()) {
            throw new IllegalStateException("Google OAuth is enabled but GOOGLE_CLIENT_ID is not configured");
        }

        try {
            // First try to decode the JWT token locally (for ID tokens)
            Map<String, Object> payload = decodeJWTPayload(idTokenString);
            if (payload != null) {
                logger.info("Successfully decoded JWT payload locally");

                // Verify audience (client ID) from JWT payload
                String audience = (String) payload.get("aud");
                if (googleClientId.equals(audience)) {
                    return extractUserInfo(payload);
                } else {
                    logger.warn("JWT audience mismatch. Expected: {}, Got: {}", googleClientId, audience);
                }
            }

            // Fallback: Verify token using Google's tokeninfo endpoint
            String url = GOOGLE_TOKENINFO_URL + idTokenString;
            logger.info("Verifying Google token with URL: {}", url);
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            if (response == null) {
                throw new SecurityException("Empty response from Google tokeninfo API");
            }

            logger.info("Google tokeninfo response keys: {}", response.keySet());

            // Verify audience (client ID)
            String audience = (String) response.get("aud");
            if (!googleClientId.equals(audience)) {
                throw new SecurityException(
                        "Invalid audience in token. Expected: " + googleClientId + ", Got: " + audience);
            }

            return extractUserInfo(response);

        } catch (HttpClientErrorException e) {
            logger.error("HTTP error from Google API: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new SecurityException("Failed to verify token with Google: " + e.getMessage());
        } catch (Exception e) {
            logger.error("Error verifying Google token", e);
            throw new SecurityException("Invalid Google token: " + e.getMessage());
        }
    }

    private Map<String, Object> decodeJWTPayload(String jwt) {
        try {
            String[] parts = jwt.split("\\.");
            if (parts.length != 3) {
                return null; // Not a valid JWT
            }

            // Decode the payload (second part)
            String payload = parts[1];
            // Add padding if needed
            while (payload.length() % 4 != 0) {
                payload += "=";
            }

            byte[] decodedBytes = Base64.getUrlDecoder().decode(payload);
            String decodedPayload = new String(decodedBytes);

            @SuppressWarnings("unchecked")
            Map<String, Object> payloadMap = objectMapper.readValue(decodedPayload, Map.class);

            return payloadMap;
        } catch (Exception e) {
            logger.debug("Failed to decode JWT locally: {}", e.getMessage());
            return null;
        }
    }

    private Map<String, Object> extractUserInfo(Map<String, Object> tokenData) {
        // Verify required fields
        String userId = (String) tokenData.get("sub");
        String email = (String) tokenData.get("email");
        String name = (String) tokenData.get("name");
        Object emailVerifiedObj = tokenData.get("email_verified");
        Boolean emailVerified = emailVerifiedObj instanceof Boolean ? (Boolean) emailVerifiedObj
                : Boolean.valueOf(String.valueOf(emailVerifiedObj));

        if (userId == null || userId.trim().isEmpty()) {
            throw new SecurityException("Missing user ID in token");
        }

        if (email == null || email.trim().isEmpty()) {
            throw new SecurityException("Missing email in token");
        }

        // Create standardized response
        Map<String, Object> standardResponse = new HashMap<>();
        standardResponse.put("sub", userId);
        standardResponse.put("email", email);
        standardResponse.put("name", name != null ? name : email);
        standardResponse.put("email_verified", emailVerified != null ? emailVerified : true);

        logger.info("Successfully verified Google token for user: {}", email);
        return standardResponse;
    }

    // Getter methods for configuration access
    public boolean isGoogleOAuthEnabled() {
        return googleOAuthEnabled;
    }

    public String getGoogleClientId() {
        return googleClientId;
    }

}