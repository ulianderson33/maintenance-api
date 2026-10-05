import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '10s',
  insecureSkipTLSVerify: true,
};

const BASE_URL = __ENV.BASE_URL || 'https://localhost';

export default function () {
  const res = http.get(`${BASE_URL}/api/health`, {
    insecureSkipTLSVerify: true,
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has data': (r) => Boolean(r.body && r.body.includes('status')),
  });

  sleep(1);
}