import { BaseJsonRepository } from './base.repository.js';

class RequestsRepository extends BaseJsonRepository {
  constructor() {
    super('requests.json');
  }

  async findByEquipmentId(equipmentId) {
    return this.findMany((r) => r.equipmentId === equipmentId);
  }

  async findOpenByEquipmentId(equipmentId) {
    return this.findMany(
      (r) =>
        r.equipmentId === equipmentId && r.status !== 'done' && r.status !== 'rejected',
    );
  }
}

export const requestsRepository = new RequestsRepository();
