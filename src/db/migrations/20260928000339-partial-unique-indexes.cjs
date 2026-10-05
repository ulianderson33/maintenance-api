'use strict';

module.exports = {
  async up(queryInterface) {
    // 1. Удаляем старые UNIQUE-констрейнты
    await queryInterface.sequelize.query(
      'ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_serial_number_key;',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE sites DROP CONSTRAINT IF EXISTS sites_code_key;',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE technicians DROP CONSTRAINT IF EXISTS technicians_employee_number_key;',
    );

    // 2. Создаём partial unique indexes
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX equipment_serial_number_active
       ON equipment (serial_number) WHERE deleted_at IS NULL;`,
    );
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX sites_code_active
       ON sites (code) WHERE deleted_at IS NULL;`,
    );
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX technicians_employee_number_active
       ON technicians (employee_number) WHERE deleted_at IS NULL;`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS equipment_serial_number_active;',
    );
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS sites_code_active;');
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS technicians_employee_number_active;',
    );

    await queryInterface.addConstraint('equipment', {
      fields: ['serial_number'],
      type: 'unique',
      name: 'equipment_serial_number_key',
    });
    await queryInterface.addConstraint('sites', {
      fields: ['code'],
      type: 'unique',
      name: 'sites_code_key',
    });
    await queryInterface.addConstraint('technicians', {
      fields: ['employee_number'],
      type: 'unique',
      name: 'technicians_employee_number_key',
    });
  },
};
