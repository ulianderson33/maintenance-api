'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('maintenance_requests', 'created_by', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addIndex('maintenance_requests', ['created_by']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('maintenance_requests', 'created_by');
  },
};