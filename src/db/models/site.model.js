import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const Site = sequelize.define(
  'Site',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: { type: DataTypes.STRING(200), allowNull: false },
    code: { type: DataTypes.STRING(50), allowNull: false },
    region: { type: DataTypes.STRING(100), allowNull: false },
    latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: false },
    longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: false },
  },
  {
    tableName: 'sites',
    underscored: true,
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at',
  },
);
