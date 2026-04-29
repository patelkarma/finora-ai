// health.js — baseline reachability + cold-vs-warm latency.
//
// On Render free tier the dyno sleeps after 15min idle; the first request
// after a sleep takes 30–60s to wake. This script logs that wake-up cost
// when run cold.
//
// Run:
//   k6 run loadtests/health.js

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8081';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '15s',
    },
  },
  thresholds: {
    // /health/liveness is a single-property probe, should be very fast.
    http_req_duration: ['p(95)<50'],
    http_req_failed:   ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/actuator/health/liveness`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'is UP':         (r) => r.json('status') === 'UP',
  });
  sleep(1);
}
