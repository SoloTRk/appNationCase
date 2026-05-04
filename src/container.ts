import { ConfigService } from './config';
import { Logger } from './logger';
import { Database } from './database/prisma-client';
import { EventBus } from './events/event-bus';
import { FeatureFlagManager } from './config/feature-flags';
import { CircuitBreaker } from './resilience/circuit-breaker';

import { ChatRepository } from './repositories/chat.repository';
import { MessageRepository } from './repositories/message.repository';
import { UserRepository } from './repositories/user.repository';

import { FeatureFlagService } from './services/feature-flag.service';
import { ChatService } from './services/chat.service';
import { CompletionService } from './services/completion.service';

import { StreamingCompletionStrategy } from './strategies/completion/streaming-completion.strategy';
import { JsonCompletionStrategy } from './strategies/completion/json-completion.strategy';
import { FullHistoryStrategy } from './strategies/history/full-history.strategy';
import { LimitedHistoryStrategy } from './strategies/history/limited-history.strategy';
import { ToolsEnabledStrategy } from './strategies/tools/tools-enabled.strategy';
import { ToolsDisabledStrategy } from './strategies/tools/tools-disabled.strategy';

import { ChatController } from './controllers/chat.controller';
import { HealthController } from './controllers/health.controller';

export function createContainer() {
  // 1. Singletons (initialization order matters)
  const config = ConfigService.getInstance();
  const logger = Logger.getInstance();
  const eventBus = EventBus.getInstance();
  const db = Database.getInstance();
  const featureFlagManager = FeatureFlagManager.getInstance(eventBus);

  // 2. Resilience
  const circuitBreaker = new CircuitBreaker(eventBus, {
    failureThreshold: config.get('circuitBreaker').failureThreshold,
    resetTimeout: config.get('circuitBreaker').resetTimeout,
  });

  // 3. Event subscriptions (Logger listens to all domain events for audit trail)
  eventBus.onAny((event, payload) => {
    logger.info('DomainEvent', { event, ...(payload as object) });
  });

  // 4. Repositories (injected with Prisma client)
  const chatRepository = new ChatRepository(db);
  const messageRepository = new MessageRepository(db);
  const userRepository = new UserRepository(db);

  // 5. Strategies
  const completionStrategies = {
    streaming: new StreamingCompletionStrategy(),
    json: new JsonCompletionStrategy(),
  };

  const historyStrategies = {
    full: new FullHistoryStrategy(),
    limited: new LimitedHistoryStrategy(),
  };

  const toolStrategies = {
    enabled: new ToolsEnabledStrategy(),
    disabled: new ToolsDisabledStrategy(),
  };

  // 6. Services (injected with repositories, strategies, event bus, circuit breaker)
  const featureFlagService = new FeatureFlagService(featureFlagManager);

  const chatService = new ChatService(
    chatRepository,
    messageRepository,
    featureFlagService,
    eventBus,
    historyStrategies,
  );

  const completionService = new CompletionService(
    messageRepository,
    featureFlagService,
    chatService,
    completionStrategies,
    historyStrategies,
    toolStrategies,
    eventBus,
    circuitBreaker,
  );

  // 7. Controllers (injected with services)
  const chatController = new ChatController(
    chatService,
    completionService,
    featureFlagService,
  );

  const healthController = new HealthController(db);

  return {
    config,
    logger,
    eventBus,
    db,
    userRepository,
    featureFlagService,
    chatController,
    healthController,
  };
}

export type Container = ReturnType<typeof createContainer>;
