package com.plabpractice.api.security;

import io.jsonwebtoken.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigInteger;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Provider for validating Supabase JWT tokens using RS256 algorithm.
 * Fetches public keys from Supabase JWKS endpoint and caches them for
 * performance.
 */
@Component
public class SupabaseJwtTokenProvider {

    private static final Logger logger = LoggerFactory.getLogger(SupabaseJwtTokenProvider.class);

    @Value("${supabase.jwt.issuer:}")
    private String supabaseIssuer;

    @Value("${supabase.project.url:}")
    private String supabaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, PublicKey> publicKeyCache = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    public SupabaseJwtTokenProvider() {
        // Refresh public keys every hour
        scheduler.scheduleAtFixedRate(this::refreshPublicKeys, 0, 1, TimeUnit.HOURS);
    }

    /**
     * Validates a Supabase JWT token
     */
    public boolean validateSupabaseToken(String token) {
        try {
            if (supabaseIssuer == null || supabaseIssuer.trim().isEmpty()) {
                logger.warn("Supabase issuer not configured, skipping token validation");
                return false;
            }

            Claims claims = getClaimsFromSupabaseToken(token);
            return claims != null;

        } catch (JwtException | IllegalArgumentException e) {
            logger.debug("Invalid Supabase JWT token: {}", e.getMessage());
            return false;
        } catch (Exception e) {
            logger.error("Error validating Supabase JWT token", e);
            return false;
        }
    }

    /**
     * Extracts user ID (sub claim) from Supabase token
     */
    public String getUserIdFromSupabaseToken(String token) {
        try {
            Claims claims = getClaimsFromSupabaseToken(token);
            return claims != null ? claims.getSubject() : null;
        } catch (Exception e) {
            logger.debug("Error extracting user ID from Supabase token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Extracts email from Supabase token
     */
    public String getEmailFromSupabaseToken(String token) {
        try {
            Claims claims = getClaimsFromSupabaseToken(token);
            return claims != null ? claims.get("email", String.class) : null;
        } catch (Exception e) {
            logger.debug("Error extracting email from Supabase token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Extracts user name from Supabase token metadata
     */
    public String getUserNameFromSupabaseToken(String token) {
        try {
            Claims claims = getClaimsFromSupabaseToken(token);
            if (claims != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> userMetadata = claims.get("user_metadata", Map.class);
                if (userMetadata != null) {
                    String name = (String) userMetadata.get("name");
                    if (name != null && !name.trim().isEmpty()) {
                        return name;
                    }
                    String fullName = (String) userMetadata.get("full_name");
                    if (fullName != null && !fullName.trim().isEmpty()) {
                        return fullName;
                    }
                }
                // Fallback to email prefix
                String email = claims.get("email", String.class);
                if (email != null) {
                    return email.split("@")[0];
                }
            }
            return null;
        } catch (Exception e) {
            logger.debug("Error extracting user name from Supabase token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Extracts all claims from Supabase token
     */
    public Claims getClaimsFromSupabaseToken(String token) {
        try {
            if (supabaseIssuer == null || supabaseIssuer.trim().isEmpty()) {
                return null;
            }

            // Parse token header to get key ID
            String[] chunks = token.split("\\.");
            if (chunks.length != 3) {
                return null;
            }

            String header = new String(Base64.getUrlDecoder().decode(chunks[0]));
            @SuppressWarnings("unchecked")
            Map<String, Object> headerMap = objectMapper.readValue(header, Map.class);
            String keyId = (String) headerMap.get("kid");

            if (keyId == null) {
                logger.debug("No kid found in JWT header");
                return null;
            }

            PublicKey publicKey = getPublicKey(keyId);
            if (publicKey == null) {
                logger.debug("No public key found for kid: {}", keyId);
                return null;
            }

            return Jwts.parserBuilder()
                    .setSigningKey(publicKey)
                    .requireIssuer(supabaseIssuer)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

        } catch (Exception e) {
            logger.debug("Error extracting claims from Supabase token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Gets public key from cache or refreshes if not found
     */
    private PublicKey getPublicKey(String keyId) {
        PublicKey cached = publicKeyCache.get(keyId);
        if (cached != null) {
            return cached;
        }

        // Try to refresh keys if not found
        refreshPublicKeys();
        return publicKeyCache.get(keyId);
    }

    /**
     * Refreshes public keys from Supabase JWKS endpoint
     */
    private void refreshPublicKeys() {
        try {
            if (supabaseUrl == null || supabaseUrl.trim().isEmpty()) {
                logger.debug("Supabase URL not configured, skipping public key refresh");
                return;
            }

            String jwksUrl = supabaseUrl + "/auth/v1/keys";
            logger.debug("Fetching JWKS from: {}", jwksUrl);

            @SuppressWarnings("unchecked")
            Map<String, Object> jwks = restTemplate.getForObject(jwksUrl, Map.class);

            if (jwks != null && jwks.containsKey("keys")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> keys = (List<Map<String, Object>>) jwks.get("keys");

                for (Map<String, Object> key : keys) {
                    String kid = (String) key.get("kid");
                    String kty = (String) key.get("kty");
                    String use = (String) key.get("use");
                    String alg = (String) key.get("alg");

                    // Only process RSA keys for signature verification
                    if ("RSA".equals(kty) && ("sig".equals(use) || use == null) &&
                            ("RS256".equals(alg) || alg == null)) {
                        try {
                            PublicKey publicKey = createRSAPublicKey(key);
                            if (publicKey != null) {
                                publicKeyCache.put(kid, publicKey);
                                logger.debug("Cached public key for kid: {}", kid);
                            }
                        } catch (Exception e) {
                            logger.warn("Failed to create public key for kid: {}", kid, e);
                        }
                    }
                }
            }

        } catch (Exception e) {
            logger.error("Failed to refresh Supabase public keys", e);
        }
    }

    /**
     * Creates RSA public key from JWKS key data
     */
    private PublicKey createRSAPublicKey(Map<String, Object> key) throws Exception {
        String nStr = (String) key.get("n");
        String eStr = (String) key.get("e");

        if (nStr == null || eStr == null) {
            return null;
        }

        byte[] nBytes = Base64.getUrlDecoder().decode(nStr);
        byte[] eBytes = Base64.getUrlDecoder().decode(eStr);

        BigInteger modulus = new BigInteger(1, nBytes);
        BigInteger exponent = new BigInteger(1, eBytes);

        RSAPublicKeySpec spec = new RSAPublicKeySpec(modulus, exponent);
        KeyFactory factory = KeyFactory.getInstance("RSA");

        return factory.generatePublic(spec);
    }

    /**
     * Shutdown hook to clean up scheduler
     */
    public void shutdown() {
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduler.shutdown();
            try {
                if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                    scheduler.shutdownNow();
                }
            } catch (InterruptedException e) {
                scheduler.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
    }
}