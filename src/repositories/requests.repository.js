import { MaintenanceRequest, Equipment, Site, Technician, RequestAssignee } from '../db/models/index.js';
import { Op } from 'sequelize';

export class RequestsRepository {
  async findAll({ status, priority, equipmentId, createdFrom, createdTo, page = 1, limit = 20, sort = 'createdAt', order = 'desc' }) {
    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (equipmentId) where.equipmentId = equipmentId;
    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) where.createdAt[Op.gte] = createdFrom;
      if (createdTo) where.createdAt[Op.lte] = createdTo;
    }

    const allowedSort = ['createdAt', 'updatedAt', 'priority', 'status', 'plannedAt'];
    const safeSort = allowedSort.includes(sort) ? sort : 'createdAt';
    const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

    const { count, rows } = await MaintenanceRequest.findAndCountAll({
      where,
      include: [
        { model: Equipment, as: 'equipment', attributes: ['id', 'name', 'serialNumber', 'type', 'status'] },
        { model: RequestAssignee, as: 'assignments', include: [{ model: Technician, as: 'technician' }] },
      ],
      limit,
      offset: (page - 1) * limit,
      order: [[safeSort, safeOrder]],
      distinct: true,
    });

    return { items: rows, total: count, page, limit };
  }

  async findById(id, options = {}) {
    return MaintenanceRequest.findByPk(id, {
      include: [
        { model: Equipment, as: 'equipment', include: [{ model: Site, as: 'site' }] },
        { model: RequestAssignee, as: 'assignments', include: [{ model: Technician, as: 'technician' }] },
      ],
      ...options,
    });
  }

  async findByEquipmentId(equipmentId) {
    return MaintenanceRequest.findAll({
      where: { equipmentId },
      order: [['createdAt', 'DESC']],
    });
  }

  async create(data, options = {}) {
    return MaintenanceRequest.create(data, options);
  }

  async update(id, patch, options = {}) {
    const [affected] = await MaintenanceRequest.update(patch, { where: { id }, ...options });
    if (affected === 0) return null;
    return this.findById(id, options);
  }

  async remove(id) {
    return MaintenanceRequest.destroy({ where: { id } });
  }

  async findOpenByEquipmentId(equipmentId) {
    return MaintenanceRequest.findAll({
      where: { equipmentId, status: { [Op.notIn]: ['done', 'rejected'] } },
    });
  }

  async withTransaction(fn) {
    const { sequelize } = await import('../db/sequelize.js');
    return sequelize.transaction(fn);
  }
}

export const requestsRepository = new RequestsRepository();