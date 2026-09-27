import Joi from 'joi';

export const equipmentLoadQuerySchema = {
  query: Joi.object({
    from: Joi.date().iso(),
    to: Joi.date().iso(),
    minRequests: Joi.number().integer().min(0).default(1),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};