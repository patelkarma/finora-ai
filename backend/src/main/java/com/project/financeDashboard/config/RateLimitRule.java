package com.project.financeDashboard.config;

import java.time.Duration;

/**
 * Declarative rate-limit rule. One rule per protected route/group.
 *
 * @param name              identifier used in logs and the 429 response
 * @param capacity          tokens that fit in the bucket (max burst size)
 * @param refillTokens      tokens added per refill window
 * @param refillPeriod      duration of one refill window
 * @param scope             whether the bucket is keyed per-IP or per-authenticated-user
 */
public record RateLimitRule(
        String name,
        long capacity,
        long refillTokens,
        Duration refillPeriod,
        Scope scope
) {
    public enum Scope { IP, USER }

    /** Convenience: N requests per duration, with capacity == N (no extra burst). */
    public static RateLimitRule perIp(String name, long n, Duration window) {
        return new RateLimitRule(name, n, n, window, Scope.IP);
    }

    public static RateLimitRule perUser(String name, long n, Duration window) {
        return new RateLimitRule(name, n, n, window, Scope.USER);
    }
}
