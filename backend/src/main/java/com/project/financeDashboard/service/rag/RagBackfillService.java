package com.project.financeDashboard.service.rag;

import com.project.financeDashboard.config.AsyncConfig;
import com.project.financeDashboard.model.Transaction;
import com.project.financeDashboard.service.TransactionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * One-time backfill of pgvector embeddings for transactions that
 * predate the RAG rollout (or any user/category that wasn't embedded
 * because of a prior outage).
 *
 * <p>This is the operational complement to the live-save indexer:
 * {@link TransactionEmbeddingIndexer} handles every NEW transaction;
 * this handles the EXISTING ones, on demand via the admin endpoint.
 *
 * <p>Pacing: each Gemini embed call is followed by a configurable
 * sleep so a single user's backfill can't burn the daily free-tier
 * quota in a thundering herd. Default 250ms ≈ 4 embeds/sec ≈ 14400/hr,
 * still well under the 1500/day quota when limited per-user by the
 * caller's rate limit.
 */
@Service
@ConditionalOnProperty(name = "rag.enabled", havingValue = "true")
public class RagBackfillService {

    private static final Logger log = LoggerFactory.getLogger(RagBackfillService.class);

    private final TransactionService transactionService;
    private final EmbeddingService embeddingService;
    private final TransactionEmbeddingDao dao;

    @Value("${rag.backfill.pace-ms:250}")
    private long paceMs;

    /** Hard cap per request — protects against an accidental 10k-tx user. */
    @Value("${rag.backfill.max-per-run:500}")
    private int maxPerRun;

    public RagBackfillService(TransactionService transactionService,
                              EmbeddingService embeddingService,
                              TransactionEmbeddingDao dao) {
        this.transactionService = transactionService;
        this.embeddingService = embeddingService;
        this.dao = dao;
    }

    /**
     * Snapshot of indexing progress. Used by the status endpoint and by
     * the backfill-trigger response to tell the client "queued N rows".
     */
    public BackfillStatus status(long userId) {
        List<Transaction> txs = transactionService.getTransactionsByUserId(userId);
        int total = txs == null ? 0 : txs.size();
        int indexed = dao.countForUser(userId);
        // Floor at 0 — if pgvector somehow has more rows than transactions
        // (e.g. transactions deleted without cascade firing), don't surface
        // a negative pending.
        int pending = Math.max(0, total - indexed);
        return new BackfillStatus(total, indexed, pending);
    }

    /**
     * Async-launched backfill. Runs on its own single-thread executor so
     * a long backfill never starves the live-save embedding pipeline.
     *
     * <p>Skips rows that already have an embedding (idempotent — calling
     * twice or while a previous run is in progress is safe). Failures on
     * an individual transaction are logged and skipped — one bad row
     * shouldn't abandon the rest of the backfill.
     */
    @Async(AsyncConfig.BACKFILL_EXECUTOR)
    public void backfillForUser(long userId) {
        List<Transaction> txs = transactionService.getTransactionsByUserId(userId);
        if (txs == null || txs.isEmpty()) {
            log.info("RAG backfill: user={} has no transactions, nothing to do", userId);
            return;
        }

        int processed = 0;
        int skipped = 0;
        int failed = 0;

        for (Transaction tx : txs) {
            if (processed + skipped >= maxPerRun) {
                log.info("RAG backfill: user={} hit per-run cap ({}), stopping",
                        userId, maxPerRun);
                break;
            }
            if (tx.getId() == null) continue;
            try {
                if (dao.exists(tx.getId())) {
                    skipped++;
                    continue;
                }
                String content = TransactionEmbeddingIndexer.describe(tx);
                float[] vec = embeddingService.embedDocument(content);
                dao.upsert(tx.getId(), userId, content, vec);
                processed++;
                // Pace between embeds to spread quota usage.
                if (paceMs > 0) {
                    try { Thread.sleep(paceMs); }
                    catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        log.warn("RAG backfill: interrupted at user={} after {}", userId, processed);
                        return;
                    }
                }
            } catch (Exception e) {
                failed++;
                log.warn("RAG backfill: failed tx={} user={}: {}",
                        tx.getId(), userId, e.toString());
            }
        }

        log.info("RAG backfill done: user={} embedded={} skipped={} failed={}",
                userId, processed, skipped, failed);
    }

    public record BackfillStatus(int total, int indexed, int pending) {}
}
