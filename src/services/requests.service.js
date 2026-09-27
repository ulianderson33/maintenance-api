import { Op } from 'sequelize';
import { sequelize } from '../db/sequelize.js';
import {
  MaintenanceRequest,
  RequestStatusHistory,
  RequestAssignee,
  Technician,
  Equipment,
} from '../db/models/index.js';
import { equipmentRepository } from '../repositories/equipment.repository.js';
import { NotFoundError } from '../errors/NotFoundError.js';
import { ConflictError } from '../errors/ConflictError.js';
import { ValidationError } from '../errors/ValidationError.js';

// Разрешённые переходы (таблица из задания)
const ALLOWED_TRANSITIONS = {
  new: ['in_progress', 'rejected'],
  in_progress: ['done', 'rejected'],
  done: [],
  rejected: [],
};

// Маппинг camelCase → snake_case для ORDER BY (БД использует snake_case)
const SORT_MAP = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  priority: 'priority',
  status: 'status',
  plannedAt: 'planned_at',
  title: 'title',
  closedAt: 'closed_at',
};

function resolveSort(sort, order) {
  const column = SORT_MAP[sort] ?? 'created_at';
  const direction = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return [column, direction];
}

export class RequestsService {
  async list(query) {
    const {
      status,
      priority,
      equipmentId,
      createdFrom,
      createdTo,
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'desc',
    } = query;

    const { count, rows } = await MaintenanceRequest.findAndCountAll({
      where: {
        ...(status && { status }),
        ...(priority && { priority }),
        ...(equipmentId && { equipmentId }),
        ...((createdFrom || createdTo) && {
          createdAt: {
            ...(createdFrom && { [Op.gte]: createdFrom }),
            ...(createdTo && { [Op.lte]: createdTo }),
          },
        }),
      },
      include: [
        { model: Equipment, as: 'equipment', attributes: ['id', 'name', 'serialNumber'] },
        {
          model: RequestAssignee,
          as: 'assignments',
          include: [{ model: Technician, as: 'technician' }],
        },
      ],
      limit,
      offset: (page - 1) * limit,
      order: [resolveSort(sort, order)],
      distinct: true,
    });

    return { items: rows, total: count, page, limit };
  }

  async getById(id) {
    const item = await MaintenanceRequest.findByPk(id, {
      include: [
        { model: Equipment, as: 'equipment' },
        {
          model: RequestAssignee,
          as: 'assignments',
          include: [{ model: Technician, as: 'technician' }],
        },
      ],
    });
    if (!item) throw new NotFoundError('Заявка', id);
    return item;
  }

  async create(data) {
    const equipment = await equipmentRepository.findById(data.equipmentId);
    if (!equipment) throw new NotFoundError('Оборудование', data.equipmentId);

    return sequelize.transaction(async (t) => {
      const created = await MaintenanceRequest.create(
        { ...data, status: 'new' },
        { transaction: t },
      );

      // Первая запись в истории — «создана»
      await RequestStatusHistory.create(
        {
          requestId: created.id,
          fromStatus: null,
          toStatus: 'new',
          author: data.author ?? 'system',
          comment: 'Заявка создана',
        },
        { transaction: t },
      );

      return created;
    });
  }

  async update(id, patch) {
    await this.getById(id);
    const [affected] = await MaintenanceRequest.update(patch, { where: { id } });
    if (affected === 0) throw new NotFoundError('Заявка', id);
    return this.getById(id);
  }

  /**
   * Смена статуса заявки с записью в историю — одной транзакцией.
   */
  async updateStatus(id, nextStatus, { author = 'system', comment } = {}) {
    return sequelize.transaction(async (t) => {
      // 1. Блокируем строку — защита от конкурентных изменений
      const request = await MaintenanceRequest.findByPk(id, {
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!request) throw new NotFoundError('Заявка', id);

      // 2. Проверяем допустимость перехода
      const allowed = ALLOWED_TRANSITIONS[request.status] ?? [];
      if (!allowed.includes(nextStatus)) {
        throw new ConflictError(
          `Недопустимый переход статуса: ${request.status} → ${nextStatus}`,
          {
            code: 'INVALID_STATUS_TRANSITION',
            details: { current: request.status, requested: nextStatus, allowed },
          },
        );
      }

      // 3. Нельзя в in_progress без исполнителей
      if (nextStatus === 'in_progress') {
        const count = await RequestAssignee.count({
          where: { requestId: id },
          transaction: t,
        });
        if (count === 0) {
          throw new ConflictError(
            'Нельзя перевести заявку в in_progress без назначенных исполнителей',
            { code: 'NO_ASSIGNEES' },
          );
        }
      }

      // 4. Обновляем заявку
      const patch = { status: nextStatus };
      if (nextStatus === 'done') patch.closedAt = new Date();
      await request.update(patch, { transaction: t });

      // 5. Пишем в историю
      await RequestStatusHistory.create(
        {
          requestId: id,
          fromStatus: request.status,
          toStatus: nextStatus,
          author,
          comment: comment ?? null,
        },
        { transaction: t },
      );

      return request;
    });
  }

  /**
   * Назначение бригады одной транзакцией: снять старых, добавить новых.
   * Ровно один lead обязателен (иначе 422).
   */
  async assignTeam(requestId, assignees) {
    if (!Array.isArray(assignees) || assignees.length === 0) {
      throw new ValidationError([
        { field: 'assignees', message: 'Список исполнителей не может быть пустым' },
      ]);
    }

    const leads = assignees.filter((a) => a.role === 'lead');
    if (leads.length !== 1) {
      throw new ValidationError([
        {
          field: 'assignees',
          message: 'Должен быть ровно один исполнитель с ролью lead',
        },
      ]);
    }

    const ids = assignees.map((a) => a.technicianId);
    if (new Set(ids).size !== ids.length) {
      throw new ValidationError([
        { field: 'assignees', message: 'Один специалист не может быть назначен дважды' },
      ]);
    }

    return sequelize.transaction(async (t) => {
      const request = await MaintenanceRequest.findByPk(requestId, {
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!request) throw new NotFoundError('Заявка', requestId);

      // Проверяем, что все специалисты существуют
      const found = await Technician.findAll({
        where: { id: ids },
        attributes: ['id'],
        transaction: t,
      });
      if (found.length !== ids.length) {
        const foundSet = new Set(found.map((x) => x.id));
        const missing = ids.filter((x) => !foundSet.has(x));
        throw new NotFoundError('Специалист', missing.join(', '));
      }

      // Снимаем прежние назначения
      await RequestAssignee.destroy({ where: { requestId }, transaction: t });

      // Добавляем новые
      await RequestAssignee.bulkCreate(
        assignees.map((a) => ({
          requestId,
          technicianId: a.technicianId,
          role: a.role,
          hours: a.hours,
        })),
        { transaction: t },
      );

      return MaintenanceRequest.findByPk(requestId, {
        include: [
          {
            model: RequestAssignee,
            as: 'assignments',
            include: [{ model: Technician, as: 'technician' }],
          },
        ],
        transaction: t,
      });
    });
  }

  /**
   * Снять одного специалиста с заявки.
   */
  async unassign(requestId, technicianId) {
    return sequelize.transaction(async (t) => {
      const request = await MaintenanceRequest.findByPk(requestId, { transaction: t });
      if (!request) throw new NotFoundError('Заявка', requestId);

      const removed = await RequestAssignee.destroy({
        where: { requestId, technicianId },
        transaction: t,
      });
      if (removed === 0) throw new NotFoundError('Назначение', technicianId);
    });
  }

  /**
   * История изменений статуса заявки.
   */
  async history(requestId) {
    const request = await MaintenanceRequest.findByPk(requestId, { attributes: ['id'] });
    if (!request) throw new NotFoundError('Заявка', requestId);

    return RequestStatusHistory.findAll({
      where: { requestId },
      order: [['created_at', 'ASC']], // ← snake_case
    });
  }

  async remove(id) {
    await this.getById(id);
    await MaintenanceRequest.destroy({ where: { id } });
  }
}

export const requestsService = new RequestsService();