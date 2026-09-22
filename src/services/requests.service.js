import { requestsRepository } from '../repositories/requests.repository.js';
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

    let items = await requestsRepository.findAll();

    if (status) items = items.filter((r) => r.status === status);
    if (priority) items = items.filter((r) => r.priority === priority);
    if (equipmentId) items = items.filter((r) => r.equipmentId === equipmentId);
    if (createdFrom) items = items.filter((r) => r.createdAt >= createdFrom);
    if (createdTo) items = items.filter((r) => r.createdAt <= createdTo);

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
    const item = await requestsRepository.findById(id);
    if (!item) throw new NotFoundError('Заявка', id);
    return item;
  }

  async create(data) {
    // Проверяем, что оборудование существует (иначе 404)
    const equipment = await equipmentRepository.findById(data.equipmentId);
    if (!equipment) throw new NotFoundError('Оборудование', data.equipmentId);

    return requestsRepository.create({
      ...data,
      status: 'new', // статус всегда new при создании
    });
  }

  async update(id, patch) {
    await this.getById(id);
    return requestsRepository.update(id, patch);
  }

  async updateStatus(id, nextStatus) {
    const request = await this.getById(id);

    const allowed = ALLOWED_TRANSITIONS[request.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new ConflictError(
        `Недопустимый переход статуса: ${request.status} → ${nextStatus}`,
        {
          code: 'INVALID_STATUS_TRANSITION',
          details: {
            current: request.status,
            requested: nextStatus,
            allowed,
          },
        },
      );
    }

    return requestsRepository.update(id, { status: nextStatus });
  }

  async remove(id) {
    await this.getById(id);
    await requestsRepository.remove(id);
  }
}

export const requestsService = new RequestsService();
