import { NotFoundError } from '../errors/NotFoundError.js';

export function notFoundHandler(req, _res, next) {
  next(new NotFoundError('Маршрут', req.originalUrl));
}
