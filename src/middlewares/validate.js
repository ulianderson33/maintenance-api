import { ValidationError } from '../errors/ValidationError.js';

/**
 * Фабрика middleware валидации.
 * @param {{ body?: Joi.Schema, query?: Joi.Schema, params?: Joi.Schema }} schemas
 */
export function validate(schemas) {
  return (req, _res, next) => {
    const errors = [];

    for (const part of ['body', 'query', 'params']) {
      const schema = schemas[part];
      if (!schema) continue;

      const { error, value } = schema.validate(req[part] ?? {}, {
        abortEarly: false,
        stripUnknown: true, // ← неизвестные поля отбрасываются
        convert: true,
      });

      if (error) {
        for (const d of error.details) {
          errors.push({
            field: d.path.join('.'),
            message: d.message,
          });
        }
      } else {
        req[part] = value; // ← заменяем на очищенный объект
      }
    }

    if (errors.length) return next(new ValidationError(errors));
    next();
  };
}
