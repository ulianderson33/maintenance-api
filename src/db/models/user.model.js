import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    email: { type: DataTypes.STRING(200), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(200), allowNull: false },
    fullName: { type: DataTypes.STRING(200), allowNull: false },
    role: {
      type: DataTypes.ENUM('viewer', 'technician', 'admin'),
      allowNull: false,
      defaultValue: 'viewer',
    },
  },
  {
    tableName: 'users',
    underscored: true,
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at',
    defaultScope: { attributes: { exclude: ['passwordHash'] } },
    scopes: { withPassword: { attributes: {} } },
  },
);
