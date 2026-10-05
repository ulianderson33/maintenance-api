import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const MaintenanceRequest = sequelize.define(
  'MaintenanceRequest',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    equipmentId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.TEXT },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('new', 'in_progress', 'done', 'rejected'),
      allowNull: false,
      defaultValue: 'new',
    },
    plannedAt: { type: DataTypes.DATE },
    author: { type: DataTypes.STRING(200), allowNull: false },
    closedAt: { type: DataTypes.DATE },
  },
  {
    tableName: 'maintenance_requests',
    underscored: true,
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at',
    indexes: [
      { fields: ['equipment_id'] },
      { fields: ['status'] },
      { fields: ['created_at'] },
    ],
  },
);
