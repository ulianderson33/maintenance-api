import Joi from 'joi';

const id = Joi.string().uuid();

export const createEquipmentSchema = {
  body: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    type: Joi.string().valid('turbine', 'inverter', 'sensor', 'substation').required(),
    serialNumber: Joi.string().min(1).max(100).required(),
    location: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lon: Joi.number().min(-180).max(180).required(),
    }).required(),
    status: Joi.string()
      .valid('operational', 'maintenance', 'fault', 'decommissioned')
      .default('operational'),
    installedAt: Joi.date().iso().max('now').required(),
  }).unknown(false),
};

export const updateEquipmentSchema = {
  params: Joi.object({ id: id.required() }),
  body: Joi.object({
    name: Joi.string().min(3).max(100),
    type: Joi.string().valid('turbine', 'inverter', 'sensor', 'substation'),
    location: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lon: Joi.number().min(-180).max(180).required(),
    }),
    status: Joi.string().valid('operational', 'maintenance', 'fault', 'decommissioned'),
    installedAt: Joi.date().iso().max('now'),
  })
    .min(1)
    .unknown(false),
};

export const idParamSchema = {
  params: Joi.object({ id: id.required() }),
};

export const listEquipmentQuerySchema = {
  query: Joi.object({
    status: Joi.string().valid('operational', 'maintenance', 'fault', 'decommissioned'),
    type: Joi.string().valid('turbine', 'inverter', 'sensor', 'substation'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('name', 'installedAt', 'createdAt').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};
