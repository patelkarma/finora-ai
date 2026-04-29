// dashboard-read.js — measure cache impact on the hot read path.
//
// Run:
//   JWT=<token> USER_ID=<id> k6 run loadtests/dashboard-read.js
//
// Optional:
//   BASE_URL  default http://localhost:8081
//   PAGE_SIZE default 20

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8081';
const JWT = __ENV.JWT;
const USER_ID = __ENV.USER_ID;
const PAGE_SIZE = __ENV.PAGE_SIZE || '20';

if (!JWT || !USER_ID) {
  throw new Error('Set JWT and USER_ID env vars. See loadtests/README.md.');
}

export const options = {
  scenarios: {
    sustained_reads: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30s',
    },
  },
  thresholds: {
    // Cache hit responses should land well under 100ms p95.
    // (Cold first hit per VU may be slower; the average across 30s × 50 VUs
    // is dominated by hot Redis lookups.)
    http_req_duration: ['p(95)<100'],
    http_req_failed:   ['rate<0.01'],
    checks:            ['rate>0.99'],
  },
};

export default function () {
  const url = `${BASE_URL}/api/transactions/user/${USER_ID}?page=0&size=${PAGE_SIZE}&sort=transactionDate,desc`;
  const res = http.get(url, {
    headers: { Authorization: `Bearer ${JWT}` },
    tags: { endpoint: 'transactions:read' },
  });

  check(res, {
    'status is 200':         (r) => r.status === 200,
    'has content array':     (r) => r.json('content') !== undefined,
    'duration < 200ms':      (r) => r.timings.duration < 200,
  });

  sleep(0.1);
}
