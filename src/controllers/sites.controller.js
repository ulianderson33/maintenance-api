import { sitesService } from '../services/sites.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const sitesController = {
  summary: asyncHandler(async (req, res) => {
    const data = await sitesService.summary(req.params.id);
    res.json({ data });
  }),
};
