import { Router } from 'express';
import { equipmentController } from '../controllers/equipment.controller.js';
import { validate } from '../middlewares/validate.js';
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  idParamSchema,
  listEquipmentQuerySchema,
} from '../validators/equipment.schema.js';

export const equipmentRouter = Router();

equipmentRouter.get('/', validate(listEquipmentQuerySchema), equipmentController.list);
equipmentRouter.post('/', validate(createEquipmentSchema), equipmentController.create);
equipmentRouter.get('/:id', validate(idParamSchema), equipmentController.getById);
equipmentRouter.patch('/:id', validate(updateEquipmentSchema), equipmentController.update);
equipmentRouter.delete('/:id', validate(idParamSchema), equipmentController.remove);
equipmentRouter.get('/:id/requests', validate(idParamSchema), equipmentController.listRequests);
equipmentRouter.get('/:id/weather', validate(idParamSchema), equipmentController.weather);