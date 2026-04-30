# ADR 0007 — Extracted ai-service over RabbitMQ

**Status:** Accepted
**Date:** 2026-04 (Phase 3.4)

## Context

Three of the backend's hottest code paths (insight generation, chat, and
embedding) all do the same thing: an HTTP call to Gemini that takes 200ms–5s
depending on prompt length and Gemini's mood. While that call is in flight,
the request thread is blocked.

Two failure modes that follow:

1. **Slow tail** — a few stuck Gemini calls during a busy minute eat the
   Tomcat connection pool and queue everything else. Render's free tier
   gives us 1 CPU; we can't out-scale it
2. **Coupled health** — a Gemini outage that surfaces as `LlmUnavailableException`
   counts against the *backend's* error budget and Sentry rate, even though
   the backend itself is healthy

The textbook fix is to extract the LLM-heavy work into its own deployable
behind a message broker. The HTTP request returns the moment the work is
queued; the broker buffers; a worker process picks it up at its own pace.

## Decision

Three-piece architecture for the insight-generation flow:

```
backend ─────▶ ai.insights.requests ──▶ ai-service
   ▲                                         │
   └────────── ai.insights.replies ◀─────────┘
```

- **`ai-service/`** — a new Spring Boot project (no Tomcat, no JPA, no
  Postgres). Its only job is consume `InsightRequest`, call Gemini, publish
  `InsightResponse`. ~150 LOC plus configuration
- **RabbitMQ** — durable direct exchange, two durable queues (request +
  reply). Hosted on CloudAMQP free tier (1M msg/month, plenty for our scale)
- **Backend** — `InsightProducer` publishes the request and registers a
  `CompletableFuture` keyed by correlationId; `InsightReplyListener` pulls
  replies and resolves the matching future. The HTTP endpoint waits with
  a 30 s timeout
- **Strangler-fig fallback** — `messaging.enabled=false` keeps the original
  in-process path active. A deploy without `RABBITMQ_URL` falls through
  cleanly so we can ship the messaging code before the broker is provisioned.
  Same fallback fires if the producer times out — the user always gets an
  insight, it just bypasses the broker

### Why explicit reply queue, not RabbitTemplate Direct Reply-To

Spring's `convertSendAndReceive` uses Direct Reply-To, an AMQP-level
pseudo-queue per connection that's invisible to `rabbitmq-management`.
The explicit reply queue costs ~30 lines extra but:

- Surfaces both queue depths in the management UI
- Survives backend restarts (the reply queue is durable; an in-flight
  reply just lands with no waiter and is dropped, instead of vanishing
  with the temp queue)
- Mirrors how a production async-RPC integration usually looks, which is
  the demonstrative point of this whole phase

### Why not a shared "contract" Maven module

Two five-line records duplicated across projects — vs. a third Maven
artifact with its own version, dependency graph, and release coordination.
For two records, duplicate. If we ever add ten DTOs we'll factor it.

The bigger win: ai-service can be re-implemented in a different language
(Python, Go, Node) without first detangling a JVM contract library.

## Consequences

**Good**
- A slow Gemini call no longer blocks a backend request thread for the
  full LLM duration — just the publish + reply round-trip (low ms in steady state)
- ai-service can be scaled / restarted / redeployed independently. A
  backend hot-fix doesn't ship a new LLM container
- Circuit breaker now lives on *both* sides: ai-service's protects Gemini,
  backend's protects against ai-service hangs (the 30 s timeout)
- The same broker can carry future async work (embedding, chat) without
  changing the topology — just new exchanges

**Less good**
- Adds CloudAMQP as a new free-tier dependency in the deploy story
- A second Render service that sleeps after 15 min idle. First request
  after sleep wakes both backend and ai-service; user sees ~60-90 s
  latency. Acceptable for a portfolio demo, painful for production
- Two-deployable test surface: integration tests for the full async flow
  need Testcontainers + a real RabbitMQ. Currently we test backend in
  isolation (with `messaging.enabled=false`) and trust the contract
- Embedding and chat are NOT yet routed through the broker — only insight
  generation. Migration of those is straightforward (same producer +
  listener pattern, different DTOs) but each is its own commit

## Alternatives considered

- **`@Async` only (status quo before this ADR)** — already used for the
  RAG indexer. Doesn't survive process restart, doesn't decouple health,
  doesn't prove the architectural point
- **Kafka instead of RabbitMQ** — overkill for our scale and free-tier
  hosting story is worse. Kafka shines for log streams and event sourcing,
  neither of which we need
- **In-process Spring Integration channels** — same JVM, no broker. Cleaner
  for unit tests but doesn't give us out-of-process isolation

## Migration path

The remaining flows can be moved to the broker incrementally:

1. **Embedding** — `TransactionEmbeddingIndexer` becomes a producer; ai-service
   adds an `EmbedRequestListener`. The pgvector write still happens in
   backend (database access stays consolidated)
2. **Chat (streaming)** — harder because SSE is tied to the HTTP connection
   on backend. One option: backend streams from a per-request reply queue
   that ai-service publishes to chunk-by-chunk. Future work

## Related

- [`ai-service/`](../../ai-service/) — the new service
- [`backend/src/main/java/com/project/financeDashboard/messaging/`](../../backend/src/main/java/com/project/financeDashboard/messaging/) — producer + reply listener
- [`backend/src/main/java/com/project/financeDashboard/config/RabbitConfig.java`](../../backend/src/main/java/com/project/financeDashboard/config/RabbitConfig.java) — topology declaration
- ADR 0001 (LlmProvider abstraction) — ai-service's GeminiClient is a
  trimmed copy of the backend's, deliberate per the "no shared module"
  decision above
