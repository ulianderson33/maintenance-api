import { requestsService } from '../services/requests.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const requestsController = {
  list: asyncHandler(async (req, res) => {
    const result = await requestsService.list(req.query);
    res.json({
      data: result.items,
      meta: { total: result.total, page: result.page, limit: result.limit },
    });
  }),

  getById: asyncHandler(async (req, res) => {
    const item = await requestsService.getById(req.params.id);
    res.json({ data: item });
  }),

  create: asyncHandler(async (req, res) => {
    const item = await requestsService.create(req.body);
    res.status(201).location(`/api/requests/${item.id}`).json({ data: item });
  }),

  update: asyncHandler(async (req, res) => {
    const item = await requestsService.update(req.params.id, req.body);
    res.json({ data: item });
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const item = await requestsService.updateStatus(req.params.id, req.body.status, {
      author: req.body.author ?? 'system',
      comment: req.body.comment,
    });
    res.json({ data: item });
  }),

  remove: asyncHandler(async (req, res) => {
    await requestsService.remove(req.params.id);
    res.status(204).send();
  }),

  // ---------- Новые эндпоинты Кейса 3 ----------

  assignTeam: asyncHandler(async (req, res) => {
    const item = await requestsService.assignTeam(req.params.id, req.body.assignees, {
      author: req.body.author ?? 'system',
    });
    res.json({ data: item });
  }),

  unassign: asyncHandler(async (req, res) => {
    await requestsService.unassign(req.params.id, req.params.userId);
    res.status(204).send();
  }),

  history: asyncHandler(async (req, res) => {
    const items = await requestsService.getHistory(req.params.id);
    res.json({ data: items });
  }),
};
