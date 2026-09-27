import { reportsService } from '../services/reports.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const reportsController = {
  equipmentLoad: asyncHandler(async (req, res) => {
    const result = await reportsService.equipmentLoad(req.query);
    res.json({
      data: result.items,
      meta: { page: result.page, limit: result.limit },
    });
  }),
};