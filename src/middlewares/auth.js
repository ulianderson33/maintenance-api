import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from '../errors/AppError.js';

/**
 * Проверяет JWT в заголовке Authorization.
 * При успехе кладёт req.user = { id, role }.
 */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(
      new AppError('Требуется аутентификация', {
        code: 'UNAUTHORIZED',
        statusCode: 401,
      }),
    );
  }

  try {
    const payload = jwt.verify(token, config.auth.accessSecret);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(
      new AppError('Недействительный или истёкший токен', {
        code: 'UNAUTHORIZED',
        statusCode: 401,
      }),
    );
  }
}

/**
 * Проверка роли. Используется после authenticate.
 * Если роль не входит в allowedRoles → 403.
 */
export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(
        new AppError('Требуется аутентификация', {
          code: 'UNAUTHORIZED',
          statusCode: 401,
        }),
      );
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('Недостаточно прав', {
          code: 'FORBIDDEN',
          statusCode: 403,
        }),
      );
    }
    next();
  };
}