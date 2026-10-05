'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('technicians', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      full_name: { type: Sequelize.STRING(200), allowNull: false },
      specialization: { type: Sequelize.STRING(100), allowNull: false },
      employee_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
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
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('technicians');
  },
};
