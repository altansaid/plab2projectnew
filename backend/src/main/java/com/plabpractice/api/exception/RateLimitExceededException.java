package com.plabpractice.api.exception;

/**
 * Exception thrown when a client exceeds the rate limit.
 */
public class RateLimitExceededException extends RuntimeException {
    
    private final long retryAfterSeconds;

    public RateLimitExceededException(String message) {
        super(message);
        this.retryAfterSeconds = 60; // Default retry after 60 seconds
    }

    public RateLimitExceededException(String message, long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}

