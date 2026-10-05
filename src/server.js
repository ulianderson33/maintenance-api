import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './middlewares/logger.js';
import { sequelize } from './db/sequelize.js';
import { testConnection } from './db/sequelize.js';

async function main() {
  try {
    await testConnection();
  } catch (err) {
    logger.error('db_connection_failed', { message: err.message });
    process.exit(1); // ← не падаем молча
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info('server_started', { port: config.port, env: config.nodeEnv });
  });

  const shutdown = async (signal) => {
    logger.info('shutdown_initiated', { signal });
    server.close(async () => {
      await sequelize.close();
      logger.info('shutdown_complete');
      process.exit(0);
    });
    // Форс-выход через 10 секунд
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
