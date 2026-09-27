'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE TYPE equipment_type AS ENUM ('turbine', 'inverter', 'sensor', 'substation');
    `);
    await queryInterface.sequelize.query(`
      CREATE TYPE equipment_status AS ENUM ('operational', 'maintenance', 'fault', 'decommissioned');
    `);
    await queryInterface.sequelize.query(`
      CREATE TYPE request_priority AS ENUM ('low', 'medium', 'high', 'critical');
    `);
    await queryInterface.sequelize.query(`
      CREATE TYPE request_status AS ENUM ('new', 'in_progress', 'done', 'rejected');
    `);
    await queryInterface.sequelize.query(`
      CREATE TYPE assignee_role AS ENUM ('lead', 'member');
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS assignee_role;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS request_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS request_priority;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS equipment_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS equipment_type;');
  },
};