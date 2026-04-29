package com.project.financeDashboard.config;

import com.project.financeDashboard.exception.RateLimitExceededException;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.Refill;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Token-bucket rate limiter built on Bucket4j. One bucket per
 * (rule × identity) tuple, kept in a thread-safe in-process map.
 *
 * <p>This is in-memory because Render free tier runs a single instance.
 * For multi-instance deployments, swap the {@code buckets} map for a
 * Redis-backed {@code ProxyManager} from {@code bucket4j-redis} — the
 * call sites and rules don't change.
 *
 * <p>The interceptor is constructed with a {@code Map<UrlPattern, Rule>};
 * route matching happens in {@link RateLimitConfig} which decides which
 * patterns each rule applies to.
 */
public class RateLimitInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(RateLimitInterceptor.class);

    private final RateLimitRule rule;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public RateLimitInterceptor(RateLimitRule rule) {
        this.rule = rule;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String key = identityKey(request);
        Bucket bucket = buckets.computeIfAbsent(key, k -> newBucket());

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            response.addHeader("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
            return true;
        }

        long retryAfterSeconds = TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill());
        if (retryAfterSeconds < 1) retryAfterSeconds = 1;

        log.warn("Rate limit hit: rule={} key={} retryAfter={}s", rule.name(), key, retryAfterSeconds);
        throw new RateLimitExceededException(rule.name(), retryAfterSeconds);
    }

    private Bucket newBucket() {
        Bandwidth limit = Bandwidth.classic(
                rule.capacity(),
                Refill.intervally(rule.refillTokens(), rule.refillPeriod())
        );
        return Bucket.builder().addLimit(limit).build();
    }

    /**
     * Build the identity key. {@link RateLimitRule.Scope#USER} prefers the
     * authenticated principal name (email) and falls back to IP if the
     * request is unauthenticated. {@link RateLimitRule.Scope#IP} is always
     * IP-based.
     */
    private String identityKey(HttpServletRequest request) {
        if (rule.scope() == RateLimitRule.Scope.USER) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
                return "user:" + auth.getName();
            }
        }
        return "ip:" + clientIp(request);
    }

    /**
     * Resolve the originating client IP. Render terminates TLS upstream
     * and forwards the client IP in {@code X-Forwarded-For}. We take the
     * first comma-separated value (the original client) and fall back to
     * {@link HttpServletRequest#getRemoteAddr()} for local dev.
     */
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return (comma > -1 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        return request.getRemoteAddr();
    }
}
