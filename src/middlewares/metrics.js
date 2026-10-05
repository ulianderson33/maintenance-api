import { httpRequestsTotal, httpRequestDuration } from '../metrics/index.js';

export function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const route = req.route?.path ?? req.baseUrl + req.path ?? 'unknown';
    const labels = {
      method: req.method,
      route,
      status: res.statusCode,
    };
    const durationSec = Number(process.hrtime.bigint() - start) / 1e9;

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationSec);
  });

  next();
}
