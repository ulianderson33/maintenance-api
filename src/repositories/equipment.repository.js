import { BaseJsonRepository } from './base.repository.js';

class EquipmentRepository extends BaseJsonRepository {
  constructor() {
    super('equipment.json');
  }

  async findBySerialNumber(serialNumber) {
    return this.findOne((e) => e.serialNumber === serialNumber);
  }
}

export const equipmentRepository = new EquipmentRepository();
