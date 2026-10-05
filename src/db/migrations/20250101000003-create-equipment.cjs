'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('equipment', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      site_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'sites', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      name: { type: Sequelize.STRING(100), allowNull: false },
      type: {
        type: Sequelize.DataTypes.ENUM('turbine', 'inverter', 'sensor', 'substation'),
        allowNull: false,
      },
      serial_number: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      status: {
        type: Sequelize.DataTypes.ENUM(
          'operational',
          'maintenance',
          'fault',
          'decommissioned',
        ),
        allowNull: false,
        defaultValue: 'operational',
      },
      installed_at: { type: Sequelize.DATEONLY, allowNull: false },
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

    await queryInterface.addIndex('equipment', ['site_id']);
    await queryInterface.addIndex('equipment', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('equipment');
  },
};
