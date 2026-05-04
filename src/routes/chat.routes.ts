import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { FeatureFlagService } from '../services/feature-flag.service';
import { appCheckMiddleware } from '../middleware/app-check.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { clientTypeMiddleware } from '../middleware/client-type.middleware';
import { validate } from '../middleware/validation.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';
import { createFeatureCheckMiddleware } from '../middleware/feature-check.middleware';
import {
  chatIdParamsSchema,
  chatListQuerySchema,
  completionBodySchema,
} from '../validators/chat.validators';

export function createChatRoutes(
  chatController: ChatController,
  featureFlagService: FeatureFlagService,
): Router {
  const router = Router();
  const featureCheck = createFeatureCheckMiddleware(featureFlagService);

  // Middleware chain applied per-route (order as specified):
  // 1. Firebase App Check  2. JWT Auth  3. Client Type Detection
  const commonChain = [
    appCheckMiddleware,
    authMiddleware,
    clientTypeMiddleware,
  ];

  // GET /api/chats - List user's chats
  router.get('/',
    ...commonChain,
    validate({ query: chatListQuerySchema }),
    rateLimiter({ max: 60 }),
    featureCheck('PAGINATION_LIMIT'),
    chatController.listChats,
  );

  // GET /api/chats/:chatId/history - Message history
  router.get('/:chatId/history',
    ...commonChain,
    validate({ params: chatIdParamsSchema }),
    rateLimiter({ max: 30 }),
    featureCheck('CHAT_HISTORY_ENABLED'),
    chatController.getChatHistory,
  );

  // POST /api/chats/:chatId/completion - AI completion (SSE or JSON)
  router.post('/:chatId/completion',
    ...commonChain,
    validate({ params: chatIdParamsSchema, body: completionBodySchema }),
    rateLimiter({ max: 10 }),
    featureCheck('STREAMING_ENABLED', 'AI_TOOLS_ENABLED'),
    chatController.completion,
  );

  return router;
}
