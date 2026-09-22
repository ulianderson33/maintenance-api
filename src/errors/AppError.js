export class AppError extends Error {
  constructor(message, { code, statusCode, details } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code ?? 'INTERNAL_ERROR';
    this.statusCode = statusCode ?? 500;
    this.details = details;
    this.isOperational = true; // ошибка «ожидаемая», не баг в коде
  }
}
