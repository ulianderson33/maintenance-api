import {
  MaintenanceRequest,
  Equipment,
  Technician,
  RequestAssignee,
} from '../db/models/index.js';
import { Op } from 'sequelize';

export class RequestsRepository {
  async findById(id, options = {}) {
    return MaintenanceRequest.findByPk(id, {
      include: [
        { model: Equipment, as: 'equipment' },
        {
          model: RequestAssignee,
          as: 'assignments',
          include: [{ model: Technician, as: 'technician' }],
        },
      ],
      ...options,
    });
  }

  async findByEquipmentId(equipmentId) {
    return MaintenanceRequest.findAll({
      where: { equipmentId },
      order: [['created_at', 'DESC']],
    });
  }

  async findOpenByEquipmentId(equipmentId) {
    return MaintenanceRequest.findAll({
      where: {
        equipmentId,
        status: { [Op.notIn]: ['done', 'rejected'] },
      },
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
}

export const requestsRepository = new RequestsRepository();