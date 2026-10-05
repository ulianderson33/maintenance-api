import { Router } from 'express';
import { equipmentController } from '../controllers/equipment.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireRole } from '../middlewares/auth.js';
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  idParamSchema,
  listEquipmentQuerySchema,
} from '../validators/equipment.schema.js';

export const equipmentRouter = Router();

equipmentRouter.get('/', validate(listEquipmentQuerySchema), equipmentController.list);
equipmentRouter.get('/:id', validate(idParamSchema), equipmentController.getById);
equipmentRouter.get(
  '/:id/requests',
  validate(idParamSchema),
  equipmentController.listRequests,
);
equipmentRouter.get('/:id/weather', validate(idParamSchema), equipmentController.weather);

equipmentRouter.post(
  '/',
  requireRole('admin'),
  validate(createEquipmentSchema),
  equipmentController.create,
);

equipmentRouter.patch(
  '/:id',
  requireRole('admin'),
  validate(updateEquipmentSchema),
  equipmentController.update,
);

equipmentRouter.delete(
  '/:id',
  requireRole('admin'),
  validate(idParamSchema),
  equipmentController.remove,
);