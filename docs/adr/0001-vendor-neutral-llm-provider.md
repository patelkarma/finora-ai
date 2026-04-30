# ADR 0001 — Vendor-neutral LLM provider abstraction

**Status:** Accepted
**Date:** 2026-02 (Phase 1)

## Context

Finora makes LLM calls in three places: insight generation, conversational chat
(streaming), and document/query embeddings for RAG. The free tier we run on
(Google Gemini) has daily quota limits and is one outage away from breaking the
demo. During development we also wanted to use a local model (Ollama) to avoid
burning API quota on every restart.

Calling the Gemini SDK directly from `ChatService` / `InsightsService` /
`RagService` would couple every consumer to vendor specifics — request shape,
endpoint URLs, error encoding. A swap (or even a model rename — see ADR 0007)
would touch every call site.

## Decision

Define a thin `LlmProvider` interface:

```java
String generate(String prompt) throws LlmUnavailableException;
default void generateStream(String prompt, Consumer<String> onChunk) { ... }
String name();
```

Two implementations:
- `GeminiLlmProvider` — `:generateContent` + `:streamGenerateContent?alt=sse`
- `OllamaLlmProvider` — `/api/generate` (local model, dev-only)

Selection at boot via `@ConditionalOnProperty(llm.provider)`. Mirror the same
shape in `EmbeddingProvider` (`embed(String) → float[]`) so the same swap story
applies to embeddings.

`LlmService` wraps the active provider with Resilience4j circuit breaker + retry
+ a 1h Redis cache. The breaker is shared across LLM and embedding paths under
the `llm` instance name — a sick Gemini brakes both.

## Consequences

**Good**
- Swap providers via env var; no code change in consumers
- A misbehaving vendor opens *one* circuit breaker that protects every code path that talks to it
- Tests can inject a stub `LlmProvider` without touching the network

**Less good**
- Streaming had to be added as a `default` interface method to keep older
  providers (Ollama) backward-compatible — the Gemini override is the only one
  that does real streaming. Ollama "streams" by emitting one chunk
- The `name()` accessor leaks the vendor identity for logging — acceptable;
  removing it would mean per-vendor `MeterRegistry` tags lose specificity

## Related

- [`backend/src/main/java/com/project/financeDashboard/service/llm/LlmProvider.java`](../../backend/src/main/java/com/project/financeDashboard/service/llm/LlmProvider.java)
- [`backend/src/main/java/com/project/financeDashboard/service/llm/LlmService.java`](../../backend/src/main/java/com/project/financeDashboard/service/llm/LlmService.java)
- ADR 0007 (when written) — model name migration from `text-embedding-004` to `gemini-embedding-001`
