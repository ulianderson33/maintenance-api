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

/**
 * @openapi
 * /requests:
 *   get:
 *     tags: [Requests]
 *     summary: Список заявок
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [new, in_progress, done, rejected] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high, critical] }
 *       - in: query
 *         name: equipmentId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Список заявок с метаданными }
 */
requestsRouter.get('/', validate(listRequestsQuerySchema), requestsController.list);

/**
 * @openapi
 * /requests:
 *   post:
 *     tags: [Requests]
 *     summary: Создать заявку
 *     description: Только technician или admin.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [equipmentId, title, priority]
 *             properties:
 *               equipmentId: { type: string, format: uuid }
 *               title: { type: string, minLength: 5 }
 *               description: { type: string }
 *               priority: { type: string, enum: [low, medium, high, critical] }
 *               plannedAt: { type: string, format: date-time }
 *     responses:
 *       201: { description: Заявка создана }
 *       403: { description: Недостаточно прав }
 *       404: { description: Оборудование не найдено }
 *       422: { description: Ошибка валидации }
 */
requestsRouter.post('/', requireRole('technician', 'admin'), validate(createRequestSchema), requestsController.create);

/**
 * @openapi
 * /requests/{id}:
 *   get:
 *     tags: [Requests]
 *     summary: Карточка заявки
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Заявка с назначениями }
 *       404: { description: Не найдено }
 */
requestsRouter.get('/:id', validate(idParamSchema), requestsController.getById);

/**
 * @openapi
 * /requests/{id}:
 *   patch:
 *     tags: [Requests]
 *     summary: Редактирование полей заявки
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               priority: { type: string, enum: [low, medium, high, critical] }
 *     responses:
 *       200: { description: Обновлено }
 *       404: { description: Не найдено }
 *       422: { description: Ошибка валидации }
 */
requestsRouter.patch('/:id', requireRole('technician', 'admin'), validate(updateRequestSchema), requestsController.update);

/**
 * @openapi
 * /requests/{id}/status:
 *   patch:
 *     tags: [Requests]
 *     summary: Смена статуса заявки
 *     description: Проверяет допустимость перехода. Technician — только свои заявки.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [new, in_progress, done, rejected] }
 *     responses:
 *       200: { description: Статус изменён }
 *       403: { description: Нет прав на эту заявку }
 *       404: { description: Не найдено }
 *       409: { description: Недопустимый переход или нет исполнителей }
 */
requestsRouter.patch('/:id/status', requireRole('technician', 'admin'), validate(updateStatusSchema), requestsController.updateStatus);

/**
 * @openapi
 * /requests/{id}/assignees:
 *   post:
 *     tags: [Requests]
 *     summary: Назначить бригаду
 *     description: Ровно один lead. Только admin.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assignees]
 *             properties:
 *               assignees:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [technicianId, role, hours]
 *                   properties:
 *                     technicianId: { type: string, format: uuid }
 *                     role: { type: string, enum: [lead, member] }
 *                     hours: { type: number, minimum: 0.5 }
 *     responses:
 *       200: { description: Бригада назначена }
 *       403: { description: Недостаточно прав }
 *       404: { description: Заявка или специалист не найдены }
 *       422: { description: Нарушение правил назначения }
 */
requestsRouter.post('/:id/assignees', requireRole('admin'), validate(assignTeamSchema), requestsController.assignTeam);

/**
 * @openapi
 * /requests/{id}/assignees/{userId}:
 *   delete:
 *     tags: [Requests]
 *     summary: Снять специалиста с заявки
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Снят }
 *       404: { description: Назначение не найдено }
 */
requestsRouter.delete('/:id/assignees/:userId', requireRole('admin'), validate(idParamSchema), requestsController.unassign);

/**
 * @openapi
 * /requests/{id}/history:
 *   get:
 *     tags: [Requests]
 *     summary: История изменений статуса
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Записи журнала }
 *       404: { description: Заявка не найдена }
 */
requestsRouter.get('/:id/history', validate(idParamSchema), requestsController.history);

/**
 * @openapi
 * /requests/{id}:
 *   delete:
 *     tags: [Requests]
 *     summary: Удалить заявку
 *     description: Только admin.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Удалено }
 *       403: { description: Недостаточно прав }
 *       404: { description: Не найдено }
 */
requestsRouter.delete('/:id', requireRole('admin'), validate(idParamSchema), requestsController.remove);