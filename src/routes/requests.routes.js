import { Router } from 'express';
import { requestsController } from '../controllers/requests.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireRole } from '../middlewares/auth.js';
import {
  createRequestSchema,
  updateRequestSchema,
  updateStatusSchema,
  assignTeamSchema,
  listRequestsQuerySchema,
  idParamSchema,
} from '../validators/requests.schema.js';

export const requestsRouter = Router();

// ---------- Чтение — любой аутентифицированный ----------
requestsRouter.get('/', validate(listRequestsQuerySchema), requestsController.list);
requestsRouter.get('/:id', validate(idParamSchema), requestsController.getById);
requestsRouter.get('/:id/history', validate(idParamSchema), requestsController.history);

// ---------- Создание и редактирование — technician или admin ----------
requestsRouter.post(
  '/',
  requireRole('technician', 'admin'),
  validate(createRequestSchema),
  requestsController.create,
);

requestsRouter.patch(
  '/:id',
  requireRole('technician', 'admin'),
  validate(updateRequestSchema),
  requestsController.update,
);

requestsRouter.patch(
  '/:id/status',
  requireRole('technician', 'admin'),
  validate(updateStatusSchema),
  requestsController.updateStatus,
);

// ---------- Назначение бригады и удаление — только admin ----------
requestsRouter.post(
  '/:id/assignees',
  requireRole('admin'),
  validate(assignTeamSchema),
  requestsController.assignTeam,
);

requestsRouter.delete(
  '/:id/assignees/:userId',
  requireRole('admin'),
  validate(idParamSchema),
  requestsController.unassign,
);

requestsRouter.delete(
  '/:id',
  requireRole('admin'),
  validate(idParamSchema),
  requestsController.remove,
);
