# Finora — load tests

[k6](https://k6.io) load tests measuring the impact of Phase 2 work
(Redis caching, composite indexes, Bucket4j rate limiting).

## Install k6

| OS | Command |
|---|---|
| macOS | `brew install k6` |
| Windows | `winget install k6` (or `choco install k6`) |
| Linux | [official packages](https://grafana.com/docs/k6/latest/set-up/install-k6/) |

Verify: `k6 version` should print 0.50+.

## Run

```bash
# Local (default)
k6 run loadtests/dashboard-read.js

# Production
BASE_URL=https://finora-backend-rnd0.onrender.com k6 run loadtests/dashboard-read.js
```

The auth-required tests need a JWT for a test user. Two ways to get one:

1. **Swagger UI** — http://localhost:8081/swagger-ui.html → `/api/auth/login` → copy the `token` from the response body.
2. **curl** —
   ```bash
   JWT=$(curl -s -X POST http://localhost:8081/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"loadtest@finora.local","password":"LoadTest1!"}' \
     | jq -r .token)
   ```

Then pass it in: `JWT=$JWT k6 run loadtests/dashboard-read.js`.

## Tests

### `dashboard-read.js` — cache impact (the headline number)

Sustained load against `GET /api/transactions/user/{id}`. The first hit
goes to Postgres; every subsequent hit (within the 5-min cache TTL) is
served from Redis. Confirms the cache is the bottleneck-relief we
claim it is.

- 50 VUs, 30 seconds
- Same user id every iteration (deliberate — proves cache hits)
- Asserts: `http_req_duration < 100ms p(95)`, `http_req_failed < 1%`

### `rate-limit.js` — 429 verification

Hits `POST /api/auth/request-otp` 30 times in 60 seconds from a single
VU. Asserts that:

- The first 5 requests return 200
- Every subsequent request returns 429 with a `Retry-After` header
  (per `RateLimitConfig` — 5 OTPs/hour/IP)
- The `Retry-After` value is between 1 and 3600 seconds

This is the regression test for Bucket4j rate limiting.

### `health.js` — baseline + smoke

Trivial GET `/actuator/health/liveness`. Confirms the service is
reachable and reports baseline `http_req_duration` numbers
(Render free-tier cold-start vs. warm).

## Recording results

Capture the k6 summary into a markdown table in [`results.md`](./results.md)
each time you run a test against a new commit. Compare against the
previous run; flag anything that regresses.

A representative result is in `results.md` so the README can quote
"p95: 240ms → 18ms after Redis cache" with a footnote pointing here.
