package com.project.financeDashboard.service.rag;

import com.project.financeDashboard.config.AsyncConfig;
import com.project.financeDashboard.event.TransactionSavedEvent;
import com.project.financeDashboard.model.Transaction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.format.DateTimeFormatter;

/**
 * Listens for {@link TransactionSavedEvent} and embeds the row into
 * pgvector. Two important traits:
 * <ul>
 *   <li>{@code @TransactionalEventListener(phase = AFTER_COMMIT)} — we
 *       only embed after the DB transaction commits. If the save rolls
 *       back, we don't waste an embedding call.</li>
 *   <li>{@code @Async} on a dedicated executor — embedding is a
 *       200-500ms Gemini round-trip; running it on the request thread
 *       would block the user's "save" response.</li>
 * </ul>
 *
 * <p>Failures are logged and swallowed: the transaction is already
 * persisted, missing an embedding only degrades RAG quality (chat falls
 * back to recent-transactions). Better than failing the user's write.
 */
@Component
@ConditionalOnProperty(name = "rag.enabled", havingValue = "true")
public class TransactionEmbeddingIndexer {

    private static final Logger log = LoggerFactory.getLogger(TransactionEmbeddingIndexer.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;

    private final EmbeddingService embeddingService;
    private final TransactionEmbeddingDao dao;

    public TransactionEmbeddingIndexer(EmbeddingService embeddingService,
                                        TransactionEmbeddingDao dao) {
        this.embeddingService = embeddingService;
        this.dao = dao;
    }

    @Async(AsyncConfig.EMBEDDING_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onTransactionSaved(TransactionSavedEvent event) {
        Transaction tx = event.transaction();
        if (tx == null || tx.getId() == null || tx.getUser() == null) {
            return;
        }

        String content = describe(tx);
        try {
            float[] vec = embeddingService.embedDocument(content);
            dao.upsert(tx.getId(), tx.getUser().getId(), content, vec);
            log.debug("Embedded transaction id={} userId={}", tx.getId(), tx.getUser().getId());
        } catch (Exception e) {
            log.warn("Failed to embed transaction id={}: {}", tx.getId(), e.toString());
        }
    }

    /**
     * Build the descriptor sentence we embed. Format is short, structured,
     * and natural-language — both the embedding model and a future re-read
     * for debugging benefit.
     *
     * <p>Examples:
     *   "Spent ₹450.00 on Food (Pizza dinner) on 2026-04-20"
     *   "Income ₹70000.00 from Salary on 2026-04-01"
     */
    static String describe(Transaction tx) {
        String type = tx.getType();
        String category = tx.getCategory() != null && !tx.getCategory().isBlank()
                ? tx.getCategory() : "Uncategorized";
        String date = tx.getTransactionDate() != null
                ? tx.getTransactionDate().format(DATE_FMT) : "unknown date";
        String desc = tx.getDescription() != null && !tx.getDescription().isBlank()
                ? " (" + tx.getDescription() + ")" : "";
        String amount = tx.getAmount() != null ? tx.getAmount().toPlainString() : "0";

        if ("income".equalsIgnoreCase(type)) {
            return "Income ₹" + amount + " from " + category + desc + " on " + date;
        }
        return "Spent ₹" + amount + " on " + category + desc + " on " + date;
    }
}
