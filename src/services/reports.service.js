import { sequelize } from '../db/sequelize.js';

export class ReportsService {
  /**
   * Отчёт по нагрузке на оборудование.
   * Прямой SQL: JOIN с подзапросами + агрегатные функции + фильтрация групп.
   *
   * @param {object} opts
   * @param {string|Date|null} [opts.from] — начало периода (по createdAt заявок)
   * @param {string|Date|null} [opts.to] — конец периода
   * @param {number} [opts.minRequests=1] — минимальное количество заявок на оборудование
   * @param {number} [opts.page=1]
   * @param {number} [opts.limit=20]
   */
  async equipmentLoad({ from = null, to = null, minRequests = 1, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    const replacements = {
      from: from ?? null,
      to: to ?? null,
      minRequests,
      limit,
      offset,
    };

    const rows = await sequelize.query(
      `
      SELECT
        e.id AS equipment_id,
        e.name AS equipment_name,
        e.serial_number,
        COALESCE(req.total_requests, 0)::int AS total_requests,
        COALESCE(req.closed_requests, 0)::int AS closed_requests,
        COALESCE(hrs.total_hours, 0)::numeric(10,2) AS total_hours,
        req.last_service_at
      FROM equipment e
      LEFT JOIN (
        SELECT
          mr.equipment_id,
          COUNT(*)::int AS total_requests,
          COUNT(mr.closed_at)::int AS closed_requests,
          MAX(mr.closed_at) AS last_service_at
        FROM maintenance_requests mr
        WHERE (:from IS NULL OR mr.created_at >= :from)
          AND (:to IS NULL OR mr.created_at <= :to)
        GROUP BY mr.equipment_id
      ) req ON req.equipment_id = e.id
      LEFT JOIN (
        SELECT
          mr2.equipment_id,
          SUM(ra.hours)::numeric(10,2) AS total_hours
        FROM request_assignees ra
        JOIN maintenance_requests mr2 ON mr2.id = ra.request_id
        WHERE (:from IS NULL OR mr2.created_at >= :from)
          AND (:to IS NULL OR mr2.created_at <= :to)
        GROUP BY mr2.equipment_id
      ) hrs ON hrs.equipment_id = e.id
      WHERE COALESCE(req.total_requests, 0) >= :minRequests
      ORDER BY total_requests DESC, e.name ASC
      LIMIT :limit OFFSET :offset
      `,
      { replacements, type: sequelize.QueryTypes.SELECT },
    );

    return { items: rows, page, limit };
  }
}

export const reportsService = new ReportsService();