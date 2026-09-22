import Joi from 'joi';

const id = Joi.string().uuid();

export const createRequestSchema = {
  body: Joi.object({
    equipmentId: id.required(),
    title: Joi.string().min(5).max(120).required(),
    description: Joi.string().max(2000).allow(''),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
    plannedAt: Joi.date().iso(),
  }).unknown(false),
};

export const updateRequestSchema = {
  params: Joi.object({ id: id.required() }),
  body: Joi.object({
    title: Joi.string().min(5).max(120),
    description: Joi.string().max(2000).allow(''),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical'),
    plannedAt: Joi.date().iso(),
  })
    .min(1)
    .unknown(false),
};

export const updateStatusSchema = {
  params: Joi.object({ id: id.required() }),
  body: Joi.object({
    status: Joi.string().valid('new', 'in_progress', 'done', 'rejected').required(),
  }).unknown(false),
};

export const listRequestsQuerySchema = {
  query: Joi.object({
    status: Joi.string().valid('new', 'in_progress', 'done', 'rejected'),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical'),
    equipmentId: id,
    createdFrom: Joi.date().iso(),
    createdTo: Joi.date().iso(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string()
      .valid('createdAt', 'updatedAt', 'priority', 'status', 'plannedAt')
      .default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

export const idParamSchema = {
  params: Joi.object({ id: id.required() }),
};
