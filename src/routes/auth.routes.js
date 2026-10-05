import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { registerSchema, loginSchema } from '../validators/auth.schema.js';
import { config } from '../config/index.js';

export const authRouter = Router();

// В тестах rate limit отключён
const loginLimiter = config.nodeEnv === 'test'
  ? (_req, _res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true,
      message: {
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Слишком много попыток входа. Попробуйте позже.',
        },
      },
    });

authRouter.post('/register', validate(registerSchema), authController.register);
authRouter.post('/login', loginLimiter, validate(loginSchema), authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);