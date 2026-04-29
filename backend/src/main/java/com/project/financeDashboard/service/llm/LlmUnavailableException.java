package com.project.financeDashboard.service.llm;

/**
 * Thrown when an LLM provider fails to produce a response — network errors,
 * timeouts, auth failures, or empty completions. Resilience4j watches for
 * this exception type to trip the circuit breaker.
 */
public class LlmUnavailableException extends RuntimeException {
    public LlmUnavailableException(String message) {
        super(message);
    }

    public LlmUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
