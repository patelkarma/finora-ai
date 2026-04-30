# Architecture Decision Records

ADRs document the **why** behind non-obvious technical choices in Finora. Each
record is short, dated, immutable once accepted (superseded rather than edited).

The format is a stripped-down [Nygard ADR](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions):
**Context → Decision → Consequences**.

| # | Title | Status |
|---|---|---|
| [0001](./0001-vendor-neutral-llm-provider.md) | Vendor-neutral LLM provider abstraction | Accepted |
| [0002](./0002-redis-cache-with-graceful-degrade.md) | Redis cache with graceful-degrade error handler | Accepted |
| [0003](./0003-pgvector-with-jdbctemplate.md) | pgvector with JdbcTemplate (not JPA) for RAG | Accepted |
| [0004](./0004-async-embedding-via-transactional-event.md) | Async embedding via `@TransactionalEventListener(AFTER_COMMIT)` | Accepted |
| [0005](./0005-sse-streaming-via-fetch-not-eventsource.md) | SSE streaming via `fetch + ReadableStream` (not `EventSource`) | Accepted |
| [0006](./0006-per-category-z-score-anomaly-detection.md) | Per-category z-score for anomaly detection | Accepted |
| [0007](./0007-extracted-ai-service-over-rabbitmq.md) | Extracted `ai-service` over RabbitMQ | Accepted |

## When to write an ADR

- A choice between viable alternatives where the *runner-up* is reasonable
- A constraint that's hard to spot from the code alone (third-party quirk, performance trade-off, security gate)
- A workaround that future-you might want to revert when the underlying issue clears

When in doubt, write it. ADRs are cheap to read and expensive to recover from
absence.
