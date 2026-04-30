package com.project.financeDashboard.service.rag;

import com.project.financeDashboard.service.llm.LlmUnavailableException;

/**
 * Vendor-neutral text-embedding contract. The active implementation
 * is selected via {@code rag.embedding.provider}; default is Gemini.
 */
public interface EmbeddingProvider {

    /**
     * Compute the embedding for {@code text}.
     *
     * @return a non-null float[] of fixed length (see {@link #dimensions()})
     * @throws LlmUnavailableException on network, auth, quota, or parse failure
     */
    float[] embed(String text) throws LlmUnavailableException;

    /** Output dimensionality. Used to validate vectors before persistence. */
    int dimensions();

    /** Short identifier for logs/metrics: "gemini", "ollama", ... */
    String name();
}
