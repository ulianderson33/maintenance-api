import { Router } from 'express';
import { sitesController } from '../controllers/sites.controller.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/equipment.schema.js';

export const sitesRouter = Router();

/**
 * @openapi
 * /sites/{id}/summary:
 *   get:
 *     tags: [Sites]
 *     summary: Сводка по площадке
 *     description: Количество заявок по статусам и приоритетам, среднее время закрытия.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Сводка }
 *       404: { description: Площадка не найдена }
 */
sitesRouter.get('/:id/summary', validate(idParamSchema), sitesController.summary);