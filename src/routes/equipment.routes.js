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

/**
 * @openapi
 * /equipment:
 *   get:
 *     tags: [Equipment]
 *     summary: Список оборудования
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [operational, maintenance, fault, decommissioned] }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [turbine, inverter, sensor, substation] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Список оборудования
 *       401:
 *         description: Не аутентифицирован
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
equipmentRouter.get('/', validate(listEquipmentQuerySchema), equipmentController.list);

/**
 * @openapi
 * /equipment:
 *   post:
 *     tags: [Equipment]
 *     summary: Создать оборудование
 *     description: Только для admin.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, serialNumber, siteId, installedAt]
 *             properties:
 *               name: { type: string, example: Turbine A1 }
 *               type: { type: string, enum: [turbine, inverter, sensor, substation] }
 *               serialNumber: { type: string, example: SN-001 }
 *               siteId: { type: string, format: uuid }
 *               installedAt: { type: string, format: date }
 *     responses:
 *       201: { description: Оборудование создано }
 *       403: { description: Недостаточно прав }
 *       409: { description: Серийный номер уже занят }
 *       422: { description: Ошибка валидации }
 */
equipmentRouter.post('/', requireRole('admin'), validate(createEquipmentSchema), equipmentController.create);

/**
 * @openapi
 * /equipment/{id}:
 *   get:
 *     tags: [Equipment]
 *     summary: Карточка оборудования
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Оборудование }
 *       404: { description: Не найдено }
 */
equipmentRouter.get('/:id', validate(idParamSchema), equipmentController.getById);

/**
 * @openapi
 * /equipment/{id}:
 *   patch:
 *     tags: [Equipment]
 *     summary: Обновить оборудование
 *     description: Только для admin.
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
 *               name: { type: string }
 *               status: { type: string, enum: [operational, maintenance, fault, decommissioned] }
 *     responses:
 *       200: { description: Обновлено }
 *       403: { description: Недостаточно прав }
 *       404: { description: Не найдено }
 *       422: { description: Ошибка валидации }
 */
equipmentRouter.patch('/:id', requireRole('admin'), validate(updateEquipmentSchema), equipmentController.update);

/**
 * @openapi
 * /equipment/{id}:
 *   delete:
 *     tags: [Equipment]
 *     summary: Удалить оборудование
 *     description: Запрещено при наличии открытых заявок. Только для admin.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Удалено }
 *       403: { description: Недостаточно прав }
 *       404: { description: Не найдено }
 *       409: { description: Есть открытые заявки }
 */
equipmentRouter.delete('/:id', requireRole('admin'), validate(idParamSchema), equipmentController.remove);

/**
 * @openapi
 * /equipment/{id}/requests:
 *   get:
 *     tags: [Equipment]
 *     summary: Заявки по оборудованию
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Список заявок }
 *       404: { description: Оборудование не найдено }
 */
equipmentRouter.get('/:id/requests', validate(idParamSchema), equipmentController.listRequests);

/**
 * @openapi
 * /equipment/{id}/weather:
 *   get:
 *     tags: [Equipment]
 *     summary: Прогноз погоды и пригодность окна
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: days
 *         schema: { type: integer, minimum: 1, maximum: 7, default: 3 }
 *     responses:
 *       200: { description: Прогноз с признаком suitable }
 *       404: { description: Оборудование не найдено }
 *       503: { description: Внешний API недоступен }
 */
equipmentRouter.get('/:id/weather', validate(idParamSchema), equipmentController.weather);