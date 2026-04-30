# ADR 0004 — Async embedding via `@TransactionalEventListener(AFTER_COMMIT)`

**Status:** Accepted
**Date:** 2026-04 (Phase 3.2)

## Context

When a user saves a transaction, we want to embed it (Gemini call, ~200-500ms)
so RAG retrieval can use it. Three places this could happen:

1. **Inline in the save method** — synchronous, blocks the user's HTTP save
   for half a second on every write
2. **Polling job** — scan for unembedded rows every N seconds and process them
   in batches
3. **Event-driven** — publish on save, subscriber processes asynchronously

Option 1 hurts perceived UX directly; the user clicks "save" and waits for
Gemini. Option 2 introduces lag (up to N seconds before the row is searchable)
and a polling thread that's expensive on Render's tiny free instance.

Option 3 is the right shape — the only design question is *when* the
subscriber fires relative to the database commit.

## Decision

Publish a domain event immediately after `repository.save()` returns, inside
a `@Transactional` boundary:

```java
@Transactional
@Caching(evict = { ... })
public Transaction saveTransaction(@NonNull Transaction transaction) {
    Transaction saved = transactionRepository.save(transaction);
    events.publishEvent(new TransactionSavedEvent(saved));
    return saved;
}
```

The listener is `@Async` (on a dedicated `embedding-` thread pool) **and**
`@TransactionalEventListener(phase = AFTER_COMMIT)`:

```java
@Async(AsyncConfig.EMBEDDING_EXECUTOR)
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void onTransactionSaved(TransactionSavedEvent event) { ... }
```

This guarantees:
- The HTTP save thread returns immediately after the event is published —
  embedding does not block the response
- The embedder only runs after the row is *actually committed*. If the
  surrounding transaction rolls back, no Gemini quota is wasted on a phantom
  row
- The embedder runs on a *different* thread pool from the live HTTP threads,
  so a sustained burst of saves doesn't starve the Tomcat connector

The thread pool is sized small (`core=2, max=4, queue=50`) with
`CallerRunsPolicy` rejection — at sustained burst, the publishing thread
runs the task itself, applying back-pressure rather than dropping embeds.

## Consequences

**Good**
- Save-path latency is unchanged by the embedding step (single-digit ms)
- A failed Gemini call (quota, network) logs a `WARN` and skips the row;
  RAG self-heals on the next user-triggered backfill
- `@TransactionalEventListener(AFTER_COMMIT)` is the textbook integration
  pattern between the persistence layer and an async side-effect
- The dedicated thread pool keeps embedding work isolated from the request
  thread pool

**Less good**
- The `@Transactional` annotation on `saveTransaction` is *required* —
  without it, there is no active transaction at the publish site and Spring
  silently drops `AFTER_COMMIT` listeners. We hit this exact bug during
  development and had to add it explicitly. Documented in code comments now
- A flood of saves (e.g. the demo seed creating 38 rows) queues 38 embeddings
  back-to-back. The thread pool drains them in ~10s, but a user staring at
  the dashboard sees the indexed count climb gradually. The `RagBadge`
  component polls and shows progress, so this is intentional UX

## Related

- [`backend/src/main/java/com/project/financeDashboard/service/rag/TransactionEmbeddingIndexer.java`](../../backend/src/main/java/com/project/financeDashboard/service/rag/TransactionEmbeddingIndexer.java)
- [`backend/src/main/java/com/project/financeDashboard/config/AsyncConfig.java`](../../backend/src/main/java/com/project/financeDashboard/config/AsyncConfig.java)
- ADR 0003 — pgvector + JdbcTemplate (the storage side of this pipeline)
