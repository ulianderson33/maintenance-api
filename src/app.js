import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/index.js';
import { requestId } from './middlewares/requestId.js';
import { requestLogger } from './middlewares/logger.js';
import { metricsMiddleware } from './middlewares/metrics.js';
import { apiRouter } from './routes/index.js';
import { metricsRouter } from './routes/metrics.routes.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { swaggerSpec } from './docs/swagger.js';

export function createApp() {
  const app = express();

  if (config.isProd) {
    app.set('trust proxy', 1);
  }

  app.use(requestId);

  app.use(requestLogger);

  app.use(metricsMiddleware);

  app.use(helmet());

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true,
    }),
  );


  app.use(
    '/api',
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );


  app.use(cookieParser());

  app.use(express.json({ limit: '100kb' }));

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      swaggerOptions: { persistAuthorization: true },
    }),
  );


  app.use('/metrics', metricsRouter);

  app.use('/api', apiRouter);

  app.use(notFoundHandler);


  app.use(errorHandler);

  return app;
}