import { Router } from 'express';
import { requestsController } from '../controllers/requests.controller.js';
import { validate } from '../middlewares/validate.js';
import {
  createRequestSchema,
  updateRequestSchema,
  updateStatusSchema,
  listRequestsQuerySchema,
  idParamSchema,
} from '../validators/requests.schema.js';

export const requestsRouter = Router();

requestsRouter.get('/', validate(listRequestsQuerySchema), requestsController.list);
requestsRouter.post('/', validate(createRequestSchema), requestsController.create);
requestsRouter.get('/:id', validate(idParamSchema), requestsController.getById);
requestsRouter.patch('/:id', validate(updateRequestSchema), requestsController.update);
requestsRouter.patch(
  '/:id/status',
  validate(updateStatusSchema),
  requestsController.updateStatus,
);
requestsRouter.delete('/:id', validate(idParamSchema), requestsController.remove);
