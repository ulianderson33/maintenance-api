'use strict';

const { randomUUID } = require('node:crypto');

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const iso = (d) => d.toISOString();

    // ---------- Площадки ----------
    const sites = [
      { id: randomUUID(), name: 'Северный ветропарк', code: 'WP-NORTH', region: 'Мурманская обл.', latitude: 68.97, longitude: 33.08 },
      { id: randomUUID(), name: 'Южный ветропарк', code: 'WP-SOUTH', region: 'Ростовская обл.', latitude: 47.23, longitude: 39.72 },
      { id: randomUUID(), name: 'Прикаспийская СЭС', code: 'SP-CASPIAN', region: 'Астраханская обл.', latitude: 46.35, longitude: 48.05 },
    ];

    await queryInterface.bulkInsert('sites', sites.map((s) => ({
      ...s,
      created_at: now,
      updated_at: now,
    })));

  const equipment = [
  { site_id: sites[0].id, name: 'Turbine A1', type: 'turbine', serial_number: 'SN-N-001', status: 'operational', installed_at: '2020-05-15' },
  { site_id: sites[0].id, name: 'Turbine A2', type: 'turbine', serial_number: 'SN-N-002', status: 'maintenance', installed_at: '2020-05-20' },
  { site_id: sites[0].id, name: 'Inverter I1', type: 'inverter', serial_number: 'SN-N-003', status: 'operational', installed_at: '2021-03-10' },
  { site_id: sites[1].id, name: 'Turbine B1', type: 'turbine', serial_number: 'SN-S-001', status: 'fault', installed_at: '2019-08-01' },
  { site_id: sites[1].id, name: 'Turbine B2', type: 'turbine', serial_number: 'SN-S-002', status: 'operational', installed_at: '2019-08-05' },
  { site_id: sites[2].id, name: 'Sensor S1', type: 'sensor', serial_number: 'SN-C-001', status: 'operational', installed_at: '2022-01-20' },
  { site_id: sites[2].id, name: 'Substation C1', type: 'substation', serial_number: 'SN-C-002', status: 'operational', installed_at: '2022-02-01' },
].map((e) => ({
  id: randomUUID(),
  ...e,
  created_at: now,
  updated_at: now,
}));

    await queryInterface.bulkInsert('equipment', equipment);

    const passports = equipment.slice(0, 5).map((e) => ({
      id: randomUUID(),
      equipment_id: e.id,
      manufacturer: 'Vestas',
      model: `V-${100 + Math.floor(Math.random() * 90)}`,
      rated_power_kw: 2000 + Math.floor(Math.random() * 1500),
      last_inspection_at: '2024-09-15',
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('equipment_passports', passports);

    // ---------- Специалисты ----------
    const technicians = [
  { full_name: 'Иванов Иван Иванович', specialization: 'Механик', employee_number: 'EMP-001' },
  { full_name: 'Петров Пётр Петрович', specialization: 'Электрик', employee_number: 'EMP-002' },
  { full_name: 'Сидоров Сидор Сидорович', specialization: 'Инженер-наладчик', employee_number: 'EMP-003' },
  { full_name: 'Кузнецов Алексей Львович', specialization: 'Высотник', employee_number: 'EMP-004' },
  { full_name: 'Смирнова Ольга Николаевна', specialization: 'Инженер КИПиА', employee_number: 'EMP-005' },
].map((t) =>({
      id: randomUUID(),
      ...t,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('technicians', technicians);

    // ---------- Заявки ----------
    const priorities = ['low', 'medium', 'high', 'critical'];
    const statuses = ['new', 'in_progress', 'done', 'rejected'];
    const requests = [];

    for (let i = 0; i < 22; i++) {
      const eq = equipment[i % equipment.length];
      const status = statuses[i % statuses.length];
      const created = new Date(now.getTime() - (30 - i) * 86400000); 
const closed = status === 'done' ? new Date(created.getTime() + (i + 1) * 3600000) : null;

      requests.push({
        id: randomUUID(),
        equipment_id: eq.id,
        title: `Заявка №${i + 1}: обслуживание ${eq.name}`,
        description: `Описание работ для ${eq.name}`,
        priority: priorities[i % priorities.length],
        status,
        planned_at: new Date(created.getTime() + 86400000),
        author: 'Диспетчер',
        closed_at: closed,
        created_at: created,
        updated_at: closed || created,
      });
    }

    await queryInterface.bulkInsert('maintenance_requests', requests);

    // ---------- История статусов ----------
    const history = [];
    for (const r of requests) {
      // Запись «создана»
      history.push({
        id: randomUUID(),
        request_id: r.id,
        from_status: null,
        to_status: 'new',
        author: r.author,
        comment: 'Заявка создана',
        created_at: r.created_at,
      });

      // Записи переходов
      if (r.status === 'in_progress' || r.status === 'done' || r.status === 'rejected') {
        history.push({
          id: randomUUID(),
          request_id: r.id,
          from_status: 'new',
          to_status: 'in_progress',
          author: 'Мастер',
          comment: 'Взято в работу',
          created_at: new Date(new Date(r.created_at).getTime() + 1800000),
        });
      }
      if (r.status === 'done' || r.status === 'rejected') {
        history.push({
          id: randomUUID(),
          request_id: r.id,
          from_status: 'in_progress',
          to_status: r.status,
          author: 'Мастер',
          comment: r.status === 'done' ? 'Работы завершены' : 'Отклонено',
          created_at: r.closed_at || new Date(new Date(r.created_at).getTime() + 3600000),
        });
      }
    }

    await queryInterface.bulkInsert('request_status_history', history);

    // ---------- Назначения ----------
    const assignments = [];
    const activeStatuses = ['new', 'in_progress'];

    for (let i = 0; i < requests.length; i++) {
      const r = requests[i];
      if (!activeStatuses.includes(r.status) && r.status !== 'done') continue;

      // На каждую заявку — 1 lead + 0..2 member
      assignments.push({
        request_id: r.id,
        technician_id: technicians[i % technicians.length].id,
        role: 'lead',
        hours: 4 + (i % 5),
        created_at: now,
      });

      if (i % 2 === 0) {
        assignments.push({
          request_id: r.id,
          technician_id: technicians[(i + 1) % technicians.length].id,
          role: 'member',
          hours: 2 + (i % 3),
          created_at: now,
        });
      }
    }

    await queryInterface.bulkInsert('request_assignees', assignments);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('request_assignees', null, {});
    await queryInterface.bulkDelete('request_status_history', null, {});
    await queryInterface.bulkDelete('maintenance_requests', null, {});
    await queryInterface.bulkDelete('technicians', null, {});
    await queryInterface.bulkDelete('equipment_passports', null, {});
    await queryInterface.bulkDelete('equipment', null, {});
    await queryInterface.bulkDelete('sites', null, {});
  },
};