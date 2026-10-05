import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const Technician = sequelize.define(
  'Technician',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    fullName: { type: DataTypes.STRING(200), allowNull: false },
    specialization: { type: DataTypes.STRING(100), allowNull: false },
    employeeNumber: { type: DataTypes.STRING(50), allowNull: false },
  },
  {
    tableName: 'technicians',
    underscored: true,
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at',
  },
);
