package com.project.financeDashboard.service.rag;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Public-facing RAG entry point. Given a user query, returns the
 * top-K most semantically relevant transactions for that user.
 *
 * <p>{@link com.project.financeDashboard.service.ChatService} consumes
 * this as {@code Optional<RagService>} so a build with {@code rag.enabled=false}
 * (tests, or rolled-back deployments) silently falls back to the older
 * "dump the recent N" prompt strategy without any code-path changes.
 *
 * <p>All failures are caught and downgraded to "no relevant rows" —
 * a degraded chat reply is always better than a 500.
 */
@Service
@ConditionalOnProperty(name = "rag.enabled", havingValue = "true")
public class RagService {

    private static final Logger log = LoggerFactory.getLogger(RagService.class);

    private final EmbeddingService embeddingService;
    private final TransactionEmbeddingDao dao;

    @Value("${rag.retrieval.top-k:10}")
    private int defaultTopK;

    public RagService(EmbeddingService embeddingService, TransactionEmbeddingDao dao) {
        this.embeddingService = embeddingService;
        this.dao = dao;
    }

    /**
     * Find the most relevant transactions for {@code query} from the
     * user's embedded history. Returns an empty list when:
     * <ul>
     *   <li>the user hasn't been indexed yet (new account, or rag was
     *       enabled mid-deployment),</li>
     *   <li>embedding the query failed,</li>
     *   <li>the similarity search threw — log and degrade.</li>
     * </ul>
     *
     * <p>The caller (ChatService) treats an empty list as "fall back to
     * the old recent-transactions strategy", which is the right behavior
     * when there's nothing better to retrieve.
     */
    public List<TransactionEmbeddingDao.RelevantTransaction> retrieveRelevant(long userId, String query) {
        return retrieveRelevant(userId, query, defaultTopK);
    }

    public List<TransactionEmbeddingDao.RelevantTransaction> retrieveRelevant(long userId, String query, int topK) {
        if (query == null || query.isBlank()) return List.of();

        // Cheap pre-check — if the user has no embeddings at all, skip
        // the Gemini round-trip entirely. A new account answers chat
        // immediately the first time without paying for an embedding
        // call that would only return zero matches anyway.
        try {
            if (dao.countForUser(userId) == 0) {
                return List.of();
            }
        } catch (Exception e) {
            log.warn("RAG count failed for user={}: {}", userId, e.getMessage());
            return List.of();
        }

        float[] queryVec;
        try {
            queryVec = embeddingService.embedQuery(query);
        } catch (Exception e) {
            log.warn("RAG query embed failed for user={}: {}", userId, e.getMessage());
            return List.of();
        }

        try {
            return dao.searchSimilar(userId, queryVec, topK);
        } catch (Exception e) {
            log.warn("RAG similarity search failed for user={}: {}", userId, e.getMessage());
            return List.of();
        }
    }
}
