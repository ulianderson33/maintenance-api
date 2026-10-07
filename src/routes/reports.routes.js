import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller.js';
import { validate } from '../middlewares/validate.js';
import { equipmentLoadQuerySchema } from '../validators/reports.schema.js';

export const reportsRouter = Router();

/**
 * @openapi
 * /reports/equipment-load:
 *   get:
 *     tags: [Reports]
 *     summary: Нагрузка на оборудование
 *     description: Аналитический отчёт на SQL — число заявок, закрытых, трудозатраты, последнее обслуживание.
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: minRequests
 *         schema: { type: integer, minimum: 0, default: 1 }
 *     responses:
 *       200: { description: Отчёт по оборудованию }
 *       422: { description: Ошибка валидации }
 */
reportsRouter.get('/equipment-load', validate(equipmentLoadQuerySchema), reportsController.equipmentLoad);