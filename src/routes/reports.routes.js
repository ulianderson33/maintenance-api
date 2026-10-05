import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller.js';
import { validate } from '../middlewares/validate.js';
import { equipmentLoadQuerySchema } from '../validators/reports.schema.js';

export const reportsRouter = Router();

reportsRouter.get(
  '/equipment-load',
  validate(equipmentLoadQuerySchema),
  reportsController.equipmentLoad,
);
