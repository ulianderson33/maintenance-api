import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const Equipment = sequelize.define(
  'Equipment',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    siteId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    type: {
      type: DataTypes.ENUM('turbine', 'inverter', 'sensor', 'substation'),
      allowNull: false,
    },
    serialNumber: { type: DataTypes.STRING(100), allowNull: false },
    status: {
      type: DataTypes.ENUM('operational', 'maintenance', 'fault', 'decommissioned'),
      allowNull: false,
      defaultValue: 'operational',
    },
    installedAt: { type: DataTypes.DATEONLY, allowNull: false },
  },
  {
    tableName: 'equipment',
    underscored: true,
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at',
    indexes: [{ fields: ['site_id'] }, { fields: ['status'] }],
  },
);