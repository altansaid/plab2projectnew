package com.plabpractice.api.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting configuration using Bucket4j.
 * Provides different rate limits for various endpoints to prevent abuse.
 */
@Component
public class RateLimitConfig {

    // Store buckets per IP address for each endpoint type
    private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> registerBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> passwordResetBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> generalApiBuckets = new ConcurrentHashMap<>();

    /**
     * Get or create a rate limit bucket for login attempts.
     * Limit: 5 requests per minute per IP
     */
    public Bucket getLoginBucket(String ipAddress) {
        return loginBuckets.computeIfAbsent(ipAddress, this::createLoginBucket);
    }

    /**
     * Get or create a rate limit bucket for registration attempts.
     * Limit: 3 requests per minute per IP
     */
    public Bucket getRegisterBucket(String ipAddress) {
        return registerBuckets.computeIfAbsent(ipAddress, this::createRegisterBucket);
    }

    /**
     * Get or create a rate limit bucket for password reset requests.
     * Limit: 3 requests per hour per IP
     */
    public Bucket getPasswordResetBucket(String ipAddress) {
        return passwordResetBuckets.computeIfAbsent(ipAddress, this::createPasswordResetBucket);
    }

    /**
     * Get or create a rate limit bucket for general API requests.
     * Limit: 100 requests per minute per IP
     */
    public Bucket getGeneralApiBucket(String ipAddress) {
        return generalApiBuckets.computeIfAbsent(ipAddress, this::createGeneralApiBucket);
    }

    private Bucket createLoginBucket(String key) {
        // 5 requests per minute for login
        Bandwidth limit = Bandwidth.classic(5, Refill.greedy(5, Duration.ofMinutes(1)));
        return Bucket.builder()
                .addLimit(limit)
                .build();
    }

    private Bucket createRegisterBucket(String key) {
        // 3 requests per minute for registration
        Bandwidth limit = Bandwidth.classic(3, Refill.greedy(3, Duration.ofMinutes(1)));
        return Bucket.builder()
                .addLimit(limit)
                .build();
    }

    private Bucket createPasswordResetBucket(String key) {
        // 3 requests per hour for password reset
        Bandwidth limit = Bandwidth.classic(3, Refill.greedy(3, Duration.ofHours(1)));
        return Bucket.builder()
                .addLimit(limit)
                .build();
    }

    private Bucket createGeneralApiBucket(String key) {
        // 100 requests per minute for general API
        Bandwidth limit = Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1)));
        return Bucket.builder()
                .addLimit(limit)
                .build();
    }

    /**
     * Check if a request should be allowed based on rate limiting.
     * 
     * @param bucket The bucket to check
     * @return true if the request is allowed, false if rate limited
     */
    public boolean tryConsume(Bucket bucket) {
        return bucket.tryConsume(1);
    }

    /**
     * Clear all rate limit buckets (useful for testing or admin reset).
     */
    public void clearAllBuckets() {
        loginBuckets.clear();
        registerBuckets.clear();
        passwordResetBuckets.clear();
        generalApiBuckets.clear();
    }

    /**
     * Get the number of remaining tokens in a bucket.
     */
    public long getAvailableTokens(Bucket bucket) {
        return bucket.getAvailableTokens();
    }
}
