import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { requestId } from './middlewares/requestId.js';
import { requestLogger } from './middlewares/logger.js';
import { apiRouter } from './routes/index.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';

export function createApp() {
  const app = express();

  // 1. Идентификатор запроса
  app.use(requestId);

  // 2. Логирование запросов
  app.use(requestLogger);

  // 3. Защитные заголовки
  app.use(helmet());

  // 4. CORS с whitelist
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

  // 5. Ограничение частоты
  app.use(
    '/api',
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // 6. Разбор JSON с ограничением размера
  app.use(express.json({ limit: '100kb' }));

  // 7. Маршруты
  app.use('/api', apiRouter);

  // 8. 404
  app.use(notFoundHandler);

  // 9. Централизованный обработчик ошибок
  app.use(errorHandler);

  return app;
}
