# Load test results

Latest representative results. Re-run after any perf-relevant change
and update this file. The README quotes the `p95` column as evidence
for the cache claim.

## Setup

- **Backend:** local Spring Boot 3.5 on M-series Mac, Java 17
- **DB:** Supabase Postgres (ap-northeast-1)
- **Cache:** Redis Cloud free tier (us-east-1)
- **Network:** home broadband to both managed services
- **Test user:** seeded with 200 transactions + 12 budgets

> Numbers from a Render free tier instance are 2-4x slower because of
> the cold-start penalty + smaller VM. Run locally for the canonical
> "what does Phase 2 buy us" numbers.

## `dashboard-read.js` — cache impact

`GET /api/transactions/user/{id}?page=0&size=20`, 50 VUs, 30 seconds.

| Configuration                       | p50    | p95    | p99    | RPS   |
|-------------------------------------|-------:|-------:|-------:|------:|
| **Phase 1** (no cache, no index)    |  185ms |  240ms |  410ms |  ~120 |
| **Phase 2.1** (Redis cache only)    |   12ms |   18ms |   34ms | ~2200 |
| **Phase 2.3** (cache + composite ix)|   11ms |   16ms |   28ms | ~2400 |

**Headline number for the README:** *"Phase 2 reduced p95 dashboard read
latency from 240ms to 18ms (13× improvement) at 18× higher throughput."*

> The cache TTL is 5 minutes; this test runs for 30s so 100% of reads
> after the first hit per VU are cache hits. The 2.3 composite index
> matters for the *first* hit per user (cold cache) and for any query
> that bypasses the cache.

## `rate-limit.js` — 429 verification

`POST /api/auth/request-otp` × 30, single VU, 2s spacing. Bucket =
5 / hour / IP.

| Metric                                | Result |
|---------------------------------------|-------:|
| 200 responses (first 5)               |    5/5 |
| 429 responses (subsequent 25)         |  25/25 |
| Retry-After header always present     |     ✅ |
| Retry-After value sane (1-3600s)      |     ✅ |
| `fields.rule == "auth.request-otp"`   |     ✅ |

## `health.js` — baseline

`GET /actuator/health/liveness`, 1 VU, 15s.

| Configuration             | p50  | p95  | p99   |
|---------------------------|-----:|-----:|------:|
| Local                     |  2ms |  4ms |   8ms |
| Render free tier (warm)   | 38ms | 52ms |  74ms |
| Render free tier (cold)   |  *first request 30-60s while dyno wakes* |
