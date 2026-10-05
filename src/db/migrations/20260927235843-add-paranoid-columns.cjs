'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = ['sites', 'equipment', 'maintenance_requests', 'technicians'];

    for (const table of tables) {
      await queryInterface.addColumn(table, 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });

      await queryInterface.addIndex(table, ['deleted_at'], {
        name: `${table}_deleted_at_idx`,
      });
    }
  },

  async down(queryInterface) {
    const tables = ['sites', 'equipment', 'maintenance_requests', 'technicians'];

    for (const table of tables) {
      await queryInterface.removeIndex(table, `${table}_deleted_at_idx`);
      await queryInterface.removeColumn(table, 'deleted_at');
    }
  },
};
