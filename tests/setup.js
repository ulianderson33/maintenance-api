import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import { sequelize } from '../src/db/sequelize.js';

beforeAll(async () => {
  await sequelize.authenticate();
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  await sequelize.query(`
    TRUNCATE TABLE
      request_assignees,
      request_status_history,
      maintenance_requests,
      equipment_passports,
      equipment,
      technicians,
      sites,
      users
    RESTART IDENTITY CASCADE
  `);
});