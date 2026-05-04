import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { HealthController } from '../controllers/health.controller';
import { FeatureFlagService } from '../services/feature-flag.service';
import { createChatRoutes } from './chat.routes';

export function createRoutes(
  chatController: ChatController,
  healthController: HealthController,
  featureFlagService: FeatureFlagService,
): Router {
  const router = Router();

  router.use('/api/chats', createChatRoutes(chatController, featureFlagService));
  router.get('/health', healthController.check);

  // Feature flags status endpoint (for debugging/admin)
  router.get('/api/feature-flags', (_req, res) => {
    res.json({
      success: true,
      data: featureFlagService.getAllFlags(),
    });
  });

  return router;
}
