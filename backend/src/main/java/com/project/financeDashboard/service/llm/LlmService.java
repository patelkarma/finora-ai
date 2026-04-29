package com.project.financeDashboard.service.llm;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Public-facing LLM service. Wraps the active {@link LlmProvider} with
 * Resilience4j circuit breaker and retry, and supplies a graceful fallback
 * when the provider is unhealthy so the user sees something useful instead
 * of a 500.
 */
@Service
public class LlmService {

    private static final Logger log = LoggerFactory.getLogger(LlmService.class);

    private final LlmProvider provider;

    public LlmService(LlmProvider provider) {
        this.provider = provider;
        log.info("LLM provider initialized: {}", provider.name());
    }

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

    public String activeProviderName() {
        return provider.name();
    }
}
