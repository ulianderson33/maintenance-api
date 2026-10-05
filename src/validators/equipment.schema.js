import Joi from 'joi';

const id = Joi.string().uuid();

export const createEquipmentSchema = {
  body: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    type: Joi.string().valid('turbine', 'inverter', 'sensor', 'substation').required(),
    serialNumber: Joi.string().min(1).max(100).required(),
    siteId: id.required(),
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
    siteId: id,
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
    siteId: id,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string()
      .valid('name', 'installedAt', 'createdAt', 'serialNumber')
      .default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};
