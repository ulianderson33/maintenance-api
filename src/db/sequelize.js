import { Sequelize } from 'sequelize';
import { config } from '../config/index.js';

export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  username: config.db.user,
  password: config.db.password,
  logging: false,
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  pool: {
    max: config.db.pool.max,
    min: config.db.pool.min,
    acquire: config.db.pool.acquire,
    idle: config.db.pool.idle,
  },
});

export async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('DB connection established');
  } catch (err) {
    console.error('Unable to connect to the database:', err.message);
    throw err;
  }
}

export async function closeConnection() {
  await sequelize.close();
}