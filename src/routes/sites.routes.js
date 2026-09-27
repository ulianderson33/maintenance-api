import { Router } from 'express';
import { sitesController } from '../controllers/sites.controller.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/equipment.schema.js';

export const sitesRouter = Router();

sitesRouter.get('/:id/summary', validate(idParamSchema), sitesController.summary);