import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp-up to 50 users
    { duration: '1m', target: 200 },  // Scale to 200 users
    { duration: '30s', target: 500 }, // Spike to 500 users
    { duration: '30s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<450', 'p(99)<1200'], // 95% of requests must complete below 450ms
    http_req_failed: ['rate<0.01'],                  // HTTP errors must be < 1%
  },
};

const BASE_URL = 'http://127.0.0.1:3000';

export default function () {
  // Scenario A: Health & Telemetry
  const resReady = http.get(`${BASE_URL}/health/ready`);
  check(resReady, {
    'health ready is 200': (r) => r.status === 200,
  });

  const resMetrics = http.get(`${BASE_URL}/metrics`);
  check(resMetrics, {
    'metrics exposition is 200': (r) => r.status === 200,
  });

  // Scenario B: Enhance Prompt API
  const payload = JSON.stringify({
    prompt: 'Application de suivi budgétaire temps réel',
    vibe: 'modern-saas',
  });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': `k6_req_${__VU}_${__ITER}`,
    },
  };
  const resEnhance = http.post(`${BASE_URL}/api/enhance-prompt`, payload, params);
  check(resEnhance, {
    'enhance prompt returned 200': (r) => r.status === 200,
  });

  sleep(0.1);
}
