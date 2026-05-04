import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Container } from './container';
import { createRoutes } from './routes';
import { requestLogger } from './middleware/request-logger.middleware';
import { errorHandler } from './middleware/error-handler.middleware';

export function createApp(container: Container): express.Application {
  const app = express();

  // Global middleware (in order)
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  // Routes
  const routes = createRoutes(
    container.chatController,
    container.healthController,
    container.featureFlagService,
  );
  app.use(routes);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
