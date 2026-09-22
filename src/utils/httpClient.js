import { config } from '../config/index.js';
import { AppError } from '../errors/AppError.js';

export async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.weather.timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new AppError('Превышено время ожидания внешнего API', {
        code: 'UPSTREAM_TIMEOUT',
        statusCode: 504,
      });
    }
    throw new AppError('Внешний API недоступен', {
      code: 'UPSTREAM_UNAVAILABLE',
      statusCode: 503,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new AppError(`Внешний API вернул статус ${response.status}`, {
      code: 'UPSTREAM_ERROR',
      statusCode: 502,
    });
  }

  try {
    return await response.json();
  } catch {
    throw new AppError('Внешний API вернул некорректный JSON', {
      code: 'UPSTREAM_BAD_JSON',
      statusCode: 502,
    });
  }
}
