import { AppError } from './AppError.js';

export class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource} с идентификатором ${id} не найден`, {
      code: 'NOT_FOUND',
      statusCode: 404,
    });
    this.name = 'NotFoundError';
  }
}
