import { Equipment, Site, EquipmentPassport, MaintenanceRequest } from '../db/models/index.js';
import { Op } from 'sequelize';

export class EquipmentRepository {
  async findAll({ status, type, page = 1, limit = 20, sort = 'createdAt', order = 'desc' }) {
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const allowedSort = ['createdAt', 'updatedAt', 'name', 'installedAt', 'serialNumber'];
    const safeSort = allowedSort.includes(sort) ? sort : 'createdAt';
    const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

    const { count, rows } = await Equipment.findAndCountAll({
      where,
      include: [
        { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'region'] },
        { model: EquipmentPassport, as: 'passport' },
      ],
      limit,
      offset: (page - 1) * limit,
      order: [[safeSort, safeOrder]],
      distinct: true,
    });

    return { items: rows, total: count, page, limit };
  }

  async findById(id) {
    return Equipment.findByPk(id, {
      include: [
        { model: Site, as: 'site' },
        { model: EquipmentPassport, as: 'passport' },
      ],
    });
  }

  async findBySerialNumber(serialNumber) {
    return Equipment.findOne({ where: { serialNumber } });
  }

  async create(data) {
    return Equipment.create(data);
  }

  async update(id, patch, options = {}) {
    const [affected] = await Equipment.update(patch, { where: { id }, ...options });
    if (affected === 0) return null;
    return this.findById(id);
  }

  async remove(id) {
    return Equipment.destroy({ where: { id } });
  }

  async hasOpenRequests(id) {
    const count = await MaintenanceRequest.count({
      where: { equipmentId: id, status: { [Op.notIn]: ['done', 'rejected'] } },
    });
    return count > 0;
  }
}

export const equipmentRepository = new EquipmentRepository();