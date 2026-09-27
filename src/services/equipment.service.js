import { Equipment, Site, EquipmentPassport } from '../db/models/index.js';
import { equipmentRepository } from '../repositories/equipment.repository.js';
import { requestsRepository } from '../repositories/requests.repository.js';
import { NotFoundError } from '../errors/NotFoundError.js';
import { ConflictError } from '../errors/ConflictError.js';

// Маппинг camelCase → snake_case для ORDER BY
const SORT_MAP = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  name: 'name',
  installedAt: 'installed_at',
  serialNumber: 'serial_number',
  status: 'status',
  type: 'type',
};

function resolveSort(sort, order) {
  const column = SORT_MAP[sort] ?? 'created_at';
  const direction = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return [column, direction];
}

export class EquipmentService {
  async list(query) {
    const {
      status,
      type,
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'desc',
    } = query;

    const { count, rows } = await Equipment.findAndCountAll({
      where: {
        ...(status && { status }),
        ...(type && { type }),
      },
      include: [
        { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'region'] },
        { model: EquipmentPassport, as: 'passport' },
      ],
      limit,
      offset: (page - 1) * limit,
      order: [resolveSort(sort, order)],
      distinct: true,
    });

    return { items: rows, total: count, page, limit };
  }

  async getById(id) {
    const item = await equipmentRepository.findById(id);
    if (!item) throw new NotFoundError('Оборудование', id);
    return item;
  }

  async create(data) {
    const existing = await equipmentRepository.findBySerialNumber(data.serialNumber);
    if (existing) {
      throw new ConflictError(
        `Оборудование с серийным номером «${data.serialNumber}» уже существует`,
        { code: 'SERIAL_NUMBER_CONFLICT' },
      );
    }
    return equipmentRepository.create(data);
  }

  async update(id, patch) {
    await this.getById(id);
    return equipmentRepository.update(id, patch);
  }

  async remove(id) {
    await this.getById(id);

    const openRequests = await requestsRepository.findOpenByEquipmentId(id);
    if (openRequests.length > 0) {
      throw new ConflictError(
        `Нельзя удалить оборудование: есть открытые заявки (${openRequests.length})`,
        { code: 'EQUIPMENT_HAS_OPEN_REQUESTS' },
      );
    }

    await equipmentRepository.remove(id);
  }

  async getRequestsForEquipment(id) {
    await this.getById(id);
    return requestsRepository.findByEquipmentId(id);
  }
}

export const equipmentService = new EquipmentService();