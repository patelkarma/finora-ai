package com.project.financeDashboard.service.rag;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * JdbcTemplate-backed access to {@code transaction_embeddings}.
 *
 * <p>JPA + pgvector is awkward — Hibernate doesn't natively know about
 * the {@code vector} type, and registering a custom UserType for it is
 * heavier than the small DAO surface needed here. We serialize float[]
 * to pgvector's text literal {@code [0.1,0.2,...]} and rely on a SQL
 * cast for both inserts and similarity queries.
 *
 * <p>Conditional on {@code rag.enabled=true} so the test profile (H2,
 * no pgvector) never instantiates this and tries to query a non-existent
 * table.
 */
@Repository
@ConditionalOnProperty(name = "rag.enabled", havingValue = "true")
public class TransactionEmbeddingDao {

    private static final Logger log = LoggerFactory.getLogger(TransactionEmbeddingDao.class);

    private final JdbcTemplate jdbc;

    public TransactionEmbeddingDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Upsert one row. The embedding is passed as a pgvector literal cast
     * via {@code ?::vector}. ON CONFLICT updates content + embedding +
     * embedded_at — re-embedding an existing transaction is supported.
     */
    public void upsert(long transactionId, long userId, String content, float[] embedding) {
        String sql = """
                INSERT INTO transaction_embeddings (transaction_id, user_id, content, embedding, embedded_at)
                VALUES (?, ?, ?, ?::vector, NOW())
                ON CONFLICT (transaction_id) DO UPDATE
                  SET content = EXCLUDED.content,
                      embedding = EXCLUDED.embedding,
                      embedded_at = NOW()
                """;
        jdbc.update(sql, transactionId, userId, content, toPgVector(embedding));
    }

    public boolean exists(long transactionId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM transaction_embeddings WHERE transaction_id = ?",
                Integer.class, transactionId);
        return count != null && count > 0;
    }

    public int countForUser(long userId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM transaction_embeddings WHERE user_id = ?",
                Integer.class, userId);
        return count == null ? 0 : count;
    }

    /**
     * Top-K transactions for {@code userId} by cosine distance to
     * {@code queryVec}. Pulls the original transaction columns we need
     * for the prompt so the chat service doesn't have to round-trip back
     * through JPA.
     *
     * <p>The {@code <=>} operator is pgvector's cosine distance. Smaller
     * = more similar, so ASC ordering surfaces the best matches first.
     */
    public List<RelevantTransaction> searchSimilar(long userId, float[] queryVec, int topK) {
        String sql = """
                SELECT t.id, t.amount, t.category, t.type, t.description, t.transaction_date,
                       (e.embedding <=> ?::vector) AS distance
                  FROM transaction_embeddings e
                  JOIN transactions t ON t.id = e.transaction_id
                 WHERE e.user_id = ?
              ORDER BY e.embedding <=> ?::vector ASC
                 LIMIT ?
                """;
        String vec = toPgVector(queryVec);
        return jdbc.query(sql, (rs, rn) -> new RelevantTransaction(
                rs.getLong("id"),
                rs.getBigDecimal("amount"),
                rs.getString("category"),
                rs.getString("type"),
                rs.getString("description"),
                rs.getObject("transaction_date", LocalDate.class),
                rs.getDouble("distance")
        ), vec, userId, vec, topK);
    }

    /** Serialize a float[] to pgvector's text representation: "[0.1,0.2,...]" */
    private static String toPgVector(float[] v) {
        StringBuilder sb = new StringBuilder(v.length * 12 + 2);
        sb.append('[');
        for (int i = 0; i < v.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(v[i]);
        }
        sb.append(']');
        return sb.toString();
    }

    /** Lightweight read-projection — avoids loading the full Transaction graph. */
    public record RelevantTransaction(
            long id,
            BigDecimal amount,
            String category,
            String type,
            String description,
            LocalDate transactionDate,
            double distance
    ) {}
}
