package com.project.financeDashboard.service.llm;

/**
 * Vendor-neutral LLM contract. Implementations are selected at startup
 * via the {@code llm.provider} property.
 */
public interface LlmProvider {

    /**
     * Generate a completion for the given prompt.
     *
     * @return non-null, non-blank model output
     * @throws LlmUnavailableException on network, auth, or provider errors
     */
    String generate(String prompt) throws LlmUnavailableException;

    /** A short identifier for logs/metrics: "ollama", "gemini", ... */
    String name();
}
