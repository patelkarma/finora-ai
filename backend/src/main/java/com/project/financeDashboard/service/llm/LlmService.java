package com.project.financeDashboard.service.llm;

import com.project.financeDashboard.config.RedisCacheConfig;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.function.Consumer;

/**
 * Public-facing LLM service. Wraps the active {@link LlmProvider} with
 * Resilience4j circuit breaker and retry, supplies a graceful fallback
 * when the provider is unhealthy, and caches identical-prompt responses
 * for 1 hour to avoid burning the Gemini free-tier quota (1500 req/day).
 *
 * <p>Cache hits skip the entire pipeline (circuit breaker, retry, HTTP
 * call) so a hot prompt resolves in &lt;5ms instead of 500–2000ms.
 */
@Service
public class LlmService {

    private static final Logger log = LoggerFactory.getLogger(LlmService.class);

    private final LlmProvider provider;

    public LlmService(LlmProvider provider) {
        this.provider = provider;
        log.info("LLM provider initialized: {}", provider.name());
    }

    /**
     * Cached on the prompt string itself. Identical prompt → identical
     * response, so re-asking the same question doesn't burn quota.
     *
     * <p>Note: {@code @Cacheable} sits OUTSIDE {@code @CircuitBreaker} in
     * the Spring proxy stack, so a cache hit also bypasses the breaker.
     * This is intentional — the breaker is there to protect the upstream
     * LLM, not the cache.
     */
    @Cacheable(value = RedisCacheConfig.CACHE_LLM, key = "#prompt")
    @CircuitBreaker(name = "llm", fallbackMethod = "fallback")
    @Retry(name = "llm")
    public String generate(String prompt) {
        return provider.generate(prompt);
    }

    /** Fallback used when the circuit is open or all retries exhausted. */
    @SuppressWarnings("unused")
    private String fallback(String prompt, Throwable ex) {
        log.warn("LLM fallback triggered for provider={} cause={}", provider.name(), ex.toString());
        return "Our AI assistant is temporarily unavailable. Your transactions and budgets are saved — please try generating an insight again in a few minutes.";
    }

    /**
     * Streaming variant of {@link #generate(String)}. Tokens are pushed
     * to {@code onChunk} as they arrive from the provider.
     *
     * <p>NOT cached — caching a stream would require buffering the full
     * response defeating the streaming UX. The non-streaming path retains
     * its 1h cache. NOT retried — replaying chunks after a partial failure
     * would produce a corrupted reply. The circuit breaker still applies,
     * with a fallback that emits a single human-readable error chunk.
     */
    @CircuitBreaker(name = "llm", fallbackMethod = "fallbackStream")
    public void generateStream(String prompt, Consumer<String> onChunk) {
        provider.generateStream(prompt, onChunk);
    }

    @SuppressWarnings("unused")
    private void fallbackStream(String prompt, Consumer<String> onChunk, Throwable ex) {
        log.warn("LLM stream fallback triggered for provider={} cause={}", provider.name(), ex.toString());
        onChunk.accept("Our AI assistant is temporarily unavailable. Please try again in a few minutes.");
    }

    public String activeProviderName() {
        return provider.name();
    }
}
