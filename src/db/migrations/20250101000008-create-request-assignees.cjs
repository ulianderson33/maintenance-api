'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('request_assignees', {
      request_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        references: { model: 'maintenance_requests', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      technician_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        references: { model: 'technicians', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      role: {
        type: Sequelize.DataTypes.ENUM('lead', 'member'),
        allowNull: false,
      },
      hours: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: false,
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    // CHECK-ограничение: hours > 0
    await queryInterface.sequelize.query(`
      ALTER TABLE request_assignees
      ADD CONSTRAINT request_assignees_hours_positive CHECK (hours > 0);
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('request_assignees');
  },
};