import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { sitesRouter } from './sites.routes.js';
import { equipmentRouter } from './equipment.routes.js';
import { requestsRouter } from './requests.routes.js';
import { reportsRouter } from './reports.routes.js';
import { authRouter } from './auth.routes.js';
import { authenticate } from '../middlewares/auth.js';

export const apiRouter = Router();


apiRouter.use('/auth', authRouter);
apiRouter.use('/health', healthRouter);


apiRouter.use('/equipment', authenticate, equipmentRouter);
apiRouter.use('/requests', authenticate, requestsRouter);
apiRouter.use('/sites', authenticate, sitesRouter);
apiRouter.use('/reports', authenticate, reportsRouter);