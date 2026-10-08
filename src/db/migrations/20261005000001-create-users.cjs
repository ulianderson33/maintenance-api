'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE TYPE user_role AS ENUM ('viewer', 'technician', 'admin');
    `);

    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      email: {
        type: Sequelize.STRING(200),
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      full_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      role: {
        type: Sequelize.DataTypes.ENUM('viewer', 'technician', 'admin'),
        allowNull: false,
        defaultValue: 'viewer',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('users', ['email'], {
      unique: true,
      where: { deleted_at: null },
      name: 'users_email_active',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS user_role;');
  },
};