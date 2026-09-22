import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './middlewares/logger.js';

const app = createApp();

app.listen(config.port, () => {
  logger.info('server_started', { port: config.port, env: config.nodeEnv });
});