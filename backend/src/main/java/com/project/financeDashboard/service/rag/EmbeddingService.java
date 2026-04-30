package com.project.financeDashboard.service.rag;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/**
 * Thin façade over the active {@link EmbeddingProvider}, adding:
 * <ul>
 *   <li>Circuit breaker (shared {@code llm} breaker — embedding traffic
 *       and chat traffic both target Gemini, a sick upstream should
 *       brake both).</li>
 *   <li>Retry on transient failures.</li>
 *   <li>Query-side cache: identical question text → same embedding,
 *       so re-asking "how am I doing" doesn't burn quota.</li>
 * </ul>
 *
 * <p>Document-side embedding (per-transaction) is NOT cached — each
 * transaction is embedded once at write time and stored in pgvector.
 */
@Service
@ConditionalOnProperty(name = "rag.enabled", havingValue = "true")
public class EmbeddingService {

    private static final Logger log = LoggerFactory.getLogger(EmbeddingService.class);

    private final EmbeddingProvider provider;

    public EmbeddingService(EmbeddingProvider provider) {
        this.provider = provider;
        log.info("Embedding provider initialized: {} ({}d)",
                provider.name(), provider.dimensions());
    }

    /**
     * Embed a chat-side query. Cached on the text so identical questions
     * resolve in &lt;5ms instead of a 200-500ms Gemini round-trip. Uses
     * the same {@code llm:response} cache as chat replies for shared TTL
     * tuning.
     */
    @Cacheable(value = "llm:response", key = "'embed:query:' + #text")
    @CircuitBreaker(name = "llm")
    @Retry(name = "llm")
    public float[] embedQuery(String text) {
        return provider.embed(text);
    }

    /**
     * Embed a transaction descriptor. NOT cached: stored in pgvector
     * once and never recomputed (unless the transaction is edited).
     */
    @CircuitBreaker(name = "llm")
    @Retry(name = "llm")
    public float[] embedDocument(String text) {
        return provider.embed(text);
    }

    public int dimensions() {
        return provider.dimensions();
    }
}
