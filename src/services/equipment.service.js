import { equipmentRepository } from '../repositories/equipment.repository.js';
import { requestsRepository } from '../repositories/requests.repository.js';
import { NotFoundError } from '../errors/NotFoundError.js';
import { ConflictError } from '../errors/ConflictError.js';
import { ValidationError } from '../errors/ValidationError.js';

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

    let items = await equipmentRepository.findAll();
    if (status) items = items.filter((e) => e.status === status);
    if (type) items = items.filter((e) => e.type === type);

    const total = items.length;
    items.sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return order === 'asc' ? cmp : -cmp;
    });

    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);

    return { items: paged, total, page, limit };
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
    await this.getById(id); // бросит 404, если нет
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
