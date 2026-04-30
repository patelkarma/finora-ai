# ADR 0003 — pgvector with JdbcTemplate (not JPA) for RAG

**Status:** Accepted
**Date:** 2026-04 (Phase 3.2)

## Context

Phase 3.2 needed semantic retrieval over the user's transaction history so
chat questions like "what did I spend on food?" could surface the right rows
instead of the most recent N. The natural store is pgvector on Postgres —
already on Supabase, no new infrastructure.

The problem: Hibernate/JPA does not natively know about the `vector(N)` type.
Three options to bridge the gap:

1. **Custom Hibernate `UserType`** registering `vector` as a JDBC type
2. **Spring Data JDBC** (lightweight, but mixes ORMs in the codebase)
3. **JdbcTemplate** with a small DAO that serializes `float[]` to pgvector's
   text literal (`[0.1,0.2,...]`) and casts in SQL (`?::vector`)

The DAO surface here is small — one upsert (`ON CONFLICT DO UPDATE`), one
similarity search, one count. Two methods of glue code carry no real benefit
of full ORM mapping.

## Decision

Plain `JdbcTemplate`, no JPA on the `transaction_embeddings` table:

```java
String sql = """
        INSERT INTO transaction_embeddings (transaction_id, user_id, content, embedding, embedded_at)
        VALUES (?, ?, ?, ?::vector, NOW())
        ON CONFLICT (transaction_id) DO UPDATE
          SET content = EXCLUDED.content,
              embedding = EXCLUDED.embedding,
              embedded_at = NOW()
        """;
jdbc.update(sql, transactionId, userId, content, toPgVector(embedding));
```

`toPgVector` is a 6-line helper that joins the `float[]` into
`"[v1,v2,...,v768]"`. The cosine-similarity search uses pgvector's `<=>`
operator with an HNSW index for ANN performance:

```sql
ORDER BY embedding <=> ?::vector ASC LIMIT ?
```

The DTO returned from the search is a Java record (`RelevantTransaction`) —
not a JPA entity — because all we need is the bare projection.

## Consequences

**Good**
- No Hibernate type registration ceremony or dependency on a third-party
  library
- The DAO file is ~120 lines; trivially readable from end to end
- ANN search via HNSW index is fast (`<5ms` over a few thousand rows on free
  tier)
- `ON DELETE CASCADE` on the FK to `transactions` keeps embeddings in sync
  with deletes for free

**Less good**
- The two storage layers (JPA for transactions, JdbcTemplate for embeddings)
  feel inconsistent at first read
- If the descriptor sentence schema changes (we add new fields), re-embed of
  the affected rows must be triggered manually via the backfill endpoint
- pgvector text-literal serialization is ASCII-encoded; for 768d the wire
  size is ~10 KB per insert. At our scale this is invisible; at 100k+
  inserts/day, switch to `pgvector-java` binary types

## Related

- [`backend/src/main/java/com/project/financeDashboard/service/rag/TransactionEmbeddingDao.java`](../../backend/src/main/java/com/project/financeDashboard/service/rag/TransactionEmbeddingDao.java)
- [`backend/src/main/resources/db/migration/V4__pgvector_transaction_embeddings.sql`](../../backend/src/main/resources/db/migration/V4__pgvector_transaction_embeddings.sql)
