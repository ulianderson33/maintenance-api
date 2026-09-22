import { equipmentService } from '../services/equipment.service.js';
import { weatherService } from '../services/weather.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const equipmentController = {
  list: asyncHandler(async (req, res) => {
    const result = await equipmentService.list(req.query);
    res.json({
      data: result.items,
      meta: { total: result.total, page: result.page, limit: result.limit },
    });
  }),

  getById: asyncHandler(async (req, res) => {
    const item = await equipmentService.getById(req.params.id);
    res.json({ data: item });
  }),

  create: asyncHandler(async (req, res) => {
    const item = await equipmentService.create(req.body);
    res.status(201).location(`/api/equipment/${item.id}`).json({ data: item });
  }),

  update: asyncHandler(async (req, res) => {
    const item = await equipmentService.update(req.params.id, req.body);
    res.json({ data: item });
  }),

  remove: asyncHandler(async (req, res) => {
    await equipmentService.remove(req.params.id);
    res.status(204).send();
  }),

  listRequests: asyncHandler(async (req, res) => {
    const items = await equipmentService.getRequestsForEquipment(req.params.id);
    res.json({ data: items });
  }),

  weather: asyncHandler(async (req, res) => {
    const eq = await equipmentService.getById(req.params.id);
    const days = Number(req.query.days ?? 3);
    const forecast = await weatherService.getForecastWithSuitability(eq.location, days);
    res.json({ data: { equipmentId: eq.id, forecast } });
  }),
};
