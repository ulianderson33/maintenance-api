import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const RequestAssignee = sequelize.define(
  'RequestAssignee',
  {
    requestId: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    technicianId: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    role: { type: DataTypes.ENUM('lead', 'member'), allowNull: false },
    hours: { type: DataTypes.DECIMAL(6, 2), allowNull: false },
  },
  {
    tableName: 'request_assignees',
    underscored: true,
    timestamps: true,
    updatedAt: false, // только created_at
  },
);