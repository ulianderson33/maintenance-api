import { AppError } from './AppError.js';

export class ConflictError extends AppError {
  constructor(message, { code = 'CONFLICT', details } = {}) {
    super(message, { code, statusCode: 409, details });
    this.name = 'ConflictError';
  }
}
