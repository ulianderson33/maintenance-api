import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const EquipmentPassport = sequelize.define(
  'EquipmentPassport',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    equipmentId: { type: DataTypes.UUID, allowNull: false, unique: true },
    manufacturer: { type: DataTypes.STRING(200), allowNull: false },
    model: { type: DataTypes.STRING(200), allowNull: false },
    ratedPowerKw: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    lastInspectionAt: { type: DataTypes.DATEONLY, allowNull: false },
  },
  { tableName: 'equipment_passports', underscored: true, timestamps: true },
);