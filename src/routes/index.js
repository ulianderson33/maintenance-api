import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { equipmentRouter } from './equipment.routes.js';
import { requestsRouter } from './requests.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/equipment', equipmentRouter);
apiRouter.use('/requests', requestsRouter);
