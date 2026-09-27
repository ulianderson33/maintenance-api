import { Equipment, Site, EquipmentPassport } from '../db/models/index.js';

export class EquipmentRepository {
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

  async update(id, patch) {
    const [affected] = await Equipment.update(patch, { where: { id } });
    if (affected === 0) return null;
    return this.findById(id);
  }

  async remove(id) {
    return Equipment.destroy({ where: { id } });
  }
}

export const equipmentRepository = new EquipmentRepository();