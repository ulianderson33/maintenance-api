import { AppError } from '../errors/AppError.js';
import { config } from '../config/index.js';
import { logger } from './logger.js';

export function errorHandler(err, req, res, _next) {
  const isAppError = err instanceof AppError;

  const status = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : 'INTERNAL_ERROR';
  const message = isAppError
    ? err.message
    : config.isProd
      ? 'Внутренняя ошибка сервера'
      : err.message;

  logger.error('request_failed', {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    status,
    code,
    message: err.message,
    ...(config.isProd ? {} : { stack: err.stack }),
  });

  const body = {
    error: {
      code,
      message,
      requestId: req.id,
      ...(err.details ? { details: err.details } : {}),
    },
  };

  res.status(status).json(body);
}
