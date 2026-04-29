package com.project.financeDashboard.exception;

/**
 * Thrown when a {@code RateLimitRule} bucket is empty. Carries the
 * advisory wait time so the global handler can populate the Retry-After
 * header on the 429 response.
 */
public class RateLimitExceededException extends RuntimeException {

    private final String ruleName;
    private final long retryAfterSeconds;

    public RateLimitExceededException(String ruleName, long retryAfterSeconds) {
        super("Rate limit exceeded for " + ruleName + "; retry after " + retryAfterSeconds + "s");
        this.ruleName = ruleName;
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public String getRuleName() {
        return ruleName;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
