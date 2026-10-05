import { sequelize } from '../db/sequelize.js';
import { Site } from '../db/models/index.js';
import { NotFoundError } from '../errors/NotFoundError.js';

export class SitesService {
  async summary(siteId) {
    const site = await Site.findByPk(siteId);
    if (!site) throw new NotFoundError('Площадка', siteId);

    const [byStatus] = await sequelize.query(
      `
      SELECT mr.status, COUNT(*)::int AS count
      FROM maintenance_requests mr
      JOIN equipment e ON e.id = mr.equipment_id
      WHERE e.site_id = :siteId
      GROUP BY mr.status
      `,
      { replacements: { siteId }, type: sequelize.QueryTypes.SELECT },
    );

    const [byPriority] = await sequelize.query(
      `
      SELECT mr.priority, COUNT(*)::int AS count
      FROM maintenance_requests mr
      JOIN equipment e ON e.id = mr.equipment_id
      WHERE e.site_id = :siteId
      GROUP BY mr.priority
      `,
      { replacements: { siteId }, type: sequelize.QueryTypes.SELECT },
    );

    const [avgRow] = await sequelize.query(
      `
      SELECT
        AVG(EXTRACT(EPOCH FROM (mr.closed_at - mr.created_at)) / 3600)::numeric(10,2) AS avg_hours
      FROM maintenance_requests mr
      JOIN equipment e ON e.id = mr.equipment_id
      WHERE e.site_id = :siteId AND mr.closed_at IS NOT NULL
      `,
      { replacements: { siteId }, type: sequelize.QueryTypes.SELECT },
    );

    return {
      site: { id: site.id, name: site.name, code: site.code, region: site.region },
      byStatus,
      byPriority,
      avgCloseHours: avgRow?.avg_hours ?? null,
    };
  }
}

export const sitesService = new SitesService();
