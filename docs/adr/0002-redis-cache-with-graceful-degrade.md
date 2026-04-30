# ADR 0002 — Redis cache with graceful-degrade error handler

**Status:** Accepted
**Date:** 2026-02 (Phase 2.1)

## Context

The dashboard hits a small set of "what's my money this month" queries on every
load — recent transactions, budgets, latest insight. Each is a Postgres read
that, on Render's free-tier shared instance, runs at p95 ~120ms cold. With a
load test of 50 concurrent users we measured p95 climbing past 600ms on the
cold-cache path.

Redis Cloud has a free 30MB tier that's plenty for this scale. The question:
how do we handle the cache being *slow or down*? The naive `RedisCacheManager`
default is to propagate exceptions out of the `@Cacheable` method, which means
a Redis outage immediately becomes a user-facing 500.

## Decision

Implement `CachingConfigurer.errorHandler()` returning a `CacheErrorHandler`
that **logs and swallows** every cache failure type:

```java
public void handleCacheGetError(RuntimeException ex, Cache cache, Object key) {
    log.warn("Cache GET error on cache={} key={}: {}", cache.getName(), key, ex.getMessage());
}
// + handleCachePutError, handleCacheEvictError, handleCacheClearError
```

When the handler returns without rethrowing, Spring falls through to the
underlying `@Cacheable` method body — exactly as if the cache weren't there.

Per-cache TTLs tuned to write/read frequency:

- `transactions:user`, `budgets:user`, `insights:user` → **5 min** (short
  enough that any missed eviction self-heals quickly)
- `llm:response` → **1 hour** (LLM responses for an identical prompt are
  deterministic; 1h hides nearly all repeat-question cost)

JSON serializer (`GenericJackson2JsonRedisSerializer`) with a
`BasicPolymorphicTypeValidator` so `List<Transaction>` round-trips back to the
same concrete element type without hitting `enableDefaultTyping()`'s known
deserialization-gadget issues.

## Consequences

**Good**
- A Redis blip degrades to a slower request, not a 500
- Transient outages don't show up in Sentry as user-facing errors — just `WARN`
  log lines
- Per-cache TTLs let us tune hot-prompt LLM caching independently from
  user-data caching
- 13× p95 latency reduction on the hot dashboard read path
  ([loadtests/results.md](../../loadtests/results.md))

**Less good**
- Cache PUT failures during outage mean we recompute on every subsequent miss
  until Redis recovers; acceptable because the underlying queries are fast
- `allEntries=true` eviction on writes means *other users'* cache lines get
  evicted by *one user's* write. Below ~10k users this is fine; if we grow,
  switch to per-key eviction (already noted in `TransactionService` Javadoc)

## Related

- [`backend/src/main/java/com/project/financeDashboard/config/RedisCacheConfig.java`](../../backend/src/main/java/com/project/financeDashboard/config/RedisCacheConfig.java)
- ADR 0001 — `LlmService` reuses this cache for prompt → response
