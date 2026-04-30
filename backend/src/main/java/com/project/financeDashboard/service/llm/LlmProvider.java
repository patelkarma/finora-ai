package com.project.financeDashboard.service.llm;

import java.util.function.Consumer;

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

    /**
     * Stream a completion as it's generated. {@code onChunk} is called
     * one or more times with partial output; the concatenation of all
     * chunks equals the full response. Default implementation degrades
     * to a single chunk for providers that don't support streaming.
     *
     * @throws LlmUnavailableException on network, auth, or provider errors
     */
    default void generateStream(String prompt, Consumer<String> onChunk) throws LlmUnavailableException {
        onChunk.accept(generate(prompt));
    }

    /** A short identifier for logs/metrics: "ollama", "gemini", ... */
    String name();
}
