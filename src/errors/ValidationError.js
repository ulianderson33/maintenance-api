import { AppError } from './AppError.js';

export class ValidationError extends AppError {
  constructor(details) {
    super('Некорректные данные запроса', {
      code: 'VALIDATION_ERROR',
      statusCode: 422,
      details,
    });
    this.name = 'ValidationError';
  }
}
