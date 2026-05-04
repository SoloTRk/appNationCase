import { createContainer } from './container';
import { createApp } from './app';
import { Database } from './database/prisma-client';
import { Logger } from './logger';

async function bootstrap() {
  const container = createContainer();
  const { config, logger } = container;

  await Database.connect();
  logger.info('Database connected');

  const app = createApp(container);
  const port = config.get('port');

  const server = app.listen(port, () => {
    logger.info(`Server started`, {
      port,
      env: config.get('env'),
      featureFlags: container.featureFlagService.getAllFlags(),
    });
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, starting graceful shutdown`);
    server.close(async () => {
      await Database.disconnect();
      logger.info('Server shut down gracefully');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  const logger = Logger.getInstance();
  logger.error('Failed to start server', { error: error.message, stack: error.stack });
  process.exit(1);
});
