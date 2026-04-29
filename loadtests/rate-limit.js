// rate-limit.js — verify Bucket4j returns 429 once the per-IP bucket
// (5 OTPs / hour) is empty, and the Retry-After header is well-formed.
//
// Run:
//   k6 run loadtests/rate-limit.js
//
// Optional:
//   BASE_URL default http://localhost:8081
//   EMAIL    default loadtest+ratelimit@example.com (NOT a real address)

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8081';
const EMAIL = __ENV.EMAIL || 'loadtest+ratelimit@example.com';

export const options = {
  // 30 requests, single VU, 1 every 2s. Bucket = 5 / hour, so we expect
  // 5 successes followed by 25 rate-limited responses.
  scenarios: {
    burst_then_drain: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 30,
      maxDuration: '90s',
    },
  },
  thresholds: {
    // We *want* most responses to be 429, so don't fail on http_req_failed.
    'checks{check:got_expected_status}': ['rate>0.95'],
  },
};

let successCount = 0;

export default function () {
  const res = http.post(
    `${BASE_URL}/api/auth/request-otp`,
    JSON.stringify({ email: EMAIL }),
    { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'request-otp' } }
  );

  if (res.status === 200) successCount++;

  // First 5 → 200; rest → 429 (Retry-After present).
  if (successCount <= 5 && res.status === 200) {
    check(res, {
      'first 5 ok':                () => true,
      got_expected_status:         () => true,
      'has X-RateLimit-Remaining': (r) => r.headers['X-Ratelimit-Remaining'] !== undefined,
    });
  } else {
    check(res, {
      'after 5 → 429':       (r) => r.status === 429,
      got_expected_status:    (r) => r.status === 429,
      'Retry-After header':   (r) => r.headers['Retry-After'] !== undefined,
      'Retry-After is sane':  (r) => {
        const v = parseInt(r.headers['Retry-After'], 10);
        return Number.isFinite(v) && v >= 1 && v <= 3600;
      },
      'envelope has rule':    (r) => r.json('fields.rule') === 'auth.request-otp',
    });
  }

  sleep(2);
}
