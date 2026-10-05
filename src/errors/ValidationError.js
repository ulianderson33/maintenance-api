import { AppError } from './AppError.js';

export class ValidationError extends AppError {
  constructor(details) {
    const message =
      details?.[0]?.message ?? 'Некорректные данные запроса';
    super(message, {
      code: 'VALIDATION_ERROR',
      statusCode: 422,
      details,
    });
    this.name = 'ValidationError';
  }
}