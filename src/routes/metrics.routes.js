import { Router } from 'express';
import { register } from '../metrics/index.js';

export const metricsRouter = Router();

metricsRouter.get('/', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});