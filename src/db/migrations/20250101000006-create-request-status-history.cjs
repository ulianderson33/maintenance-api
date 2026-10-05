'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('request_status_history', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      request_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'maintenance_requests', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      from_status: {
        type: Sequelize.DataTypes.ENUM('new', 'in_progress', 'done', 'rejected'),
        allowNull: true,
      },
      to_status: {
        type: Sequelize.DataTypes.ENUM('new', 'in_progress', 'done', 'rejected'),
        allowNull: false,
      },
      author: { type: Sequelize.STRING(200), allowNull: false },
      comment: { type: Sequelize.TEXT },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('request_status_history', ['request_id', 'created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('request_status_history');
  },
};
