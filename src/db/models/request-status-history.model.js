import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const RequestStatusHistory = sequelize.define(
  'RequestStatusHistory',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    requestId: { type: DataTypes.UUID, allowNull: false },
    fromStatus: {
      type: DataTypes.ENUM('new', 'in_progress', 'done', 'rejected'),
      allowNull: true,
    },
    toStatus: {
      type: DataTypes.ENUM('new', 'in_progress', 'done', 'rejected'),
      allowNull: false,
    },
    author: { type: DataTypes.STRING(200), allowNull: false },
    comment: { type: DataTypes.TEXT },
  },
  {
    tableName: 'request_status_history',
    underscored: true,
    timestamps: true,
    updatedAt: false, // в†ђ Р·Р°РїРёСЃРё РЅРµ РёР·РјРµРЅСЏСЋС‚СЃСЏ
  },
);