'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('maintenance_requests', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      equipment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'equipment', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      title: { type: Sequelize.STRING(120), allowNull: false },
      description: { type: Sequelize.TEXT },
      priority: {
        type: Sequelize.DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
      },
      status: {
        type: Sequelize.DataTypes.ENUM('new', 'in_progress', 'done', 'rejected'),
        allowNull: false,
        defaultValue: 'new',
      },
      planned_at: { type: Sequelize.DATE },
      author: { type: Sequelize.STRING(200), allowNull: false },
      closed_at: { type: Sequelize.DATE },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('maintenance_requests', ['equipment_id']);
    await queryInterface.addIndex('maintenance_requests', ['status']);
    await queryInterface.addIndex('maintenance_requests', ['created_at']);
    await queryInterface.addIndex('maintenance_requests', ['priority']);
    await queryInterface.addIndex('maintenance_requests', ['closed_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('maintenance_requests');
  },
};