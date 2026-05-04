import { ChatService } from '../../../src/services/chat.service';
import { FeatureFlagService } from '../../../src/services/feature-flag.service';
import { FeatureFlagManager } from '../../../src/config/feature-flags';
import { EventBus } from '../../../src/events/event-bus';
import { FullHistoryStrategy } from '../../../src/strategies/history/full-history.strategy';
import { LimitedHistoryStrategy } from '../../../src/strategies/history/limited-history.strategy';
import { ApiError } from '../../../src/utils/api-error';
import { Chat, Message, Role } from '@prisma/client';

function makeChat(id: string, userId = 'user-1'): Chat {
  return {
    id,
    title: `Chat ${id}`,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeMessage(id: string, chatId: string): Message {
  return {
    id,
    chatId,
    role: Role.user,
    content: `Message ${id}`,
    metadata: null,
    createdAt: new Date(),
  };
}

function makeMockChatRepo(chats: Chat[] = [], findResult: Chat | null = null) {
  return {
    findByUserId: jest.fn().mockResolvedValue(chats),
    findByIdAndUserId: jest.fn().mockResolvedValue(findResult),
    create: jest.fn().mockImplementation(async (userId: string, title: string) => makeChat(title, userId)),
  };
}

function makeMockMessageRepo(messages: Message[] = []) {
  return {
    findByChatId: jest.fn().mockResolvedValue(messages),
    findByChatIdLimited: jest.fn().mockResolvedValue(messages),
    create: jest.fn(),
  };
}

describe('ChatService', () => {
  let service: ChatService;
  let chatRepo: ReturnType<typeof makeMockChatRepo>;
  let messageRepo: ReturnType<typeof makeMockMessageRepo>;
  let featureFlagService: FeatureFlagService;
  let eventBus: EventBus;

  beforeEach(() => {
    FeatureFlagManager.resetInstance();
    EventBus.resetInstance();
    eventBus = EventBus.getInstance();
    featureFlagService = new FeatureFlagService(FeatureFlagManager.getInstance());
    chatRepo = makeMockChatRepo();
    messageRepo = makeMockMessageRepo();
    service = new ChatService(
      chatRepo as never,
      messageRepo as never,
      featureFlagService,
      eventBus,
      { full: new FullHistoryStrategy(), limited: new LimitedHistoryStrategy() },
    );
  });

  afterEach(() => {
    FeatureFlagManager.resetInstance();
    EventBus.resetInstance();
  });

  describe('listChats', () => {
    it('returns paginated chats', async () => {
      const chats = Array.from({ length: 5 }, (_, i) => makeChat(`chat-${i}`));
      chatRepo.findByUserId.mockResolvedValue(chats);

      const result = await service.listChats('user-1', { limit: 10 });

      expect(result.items).toHaveLength(5);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('returns hasMore=true when more chats exist', async () => {
      const limit = 20;
      const chats = Array.from({ length: limit + 1 }, (_, i) => makeChat(`chat-${i}`));
      chatRepo.findByUserId.mockResolvedValue(chats);

      const result = await service.listChats('user-1', { limit });

      expect(result.items).toHaveLength(limit);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe(`chat-${limit - 1}`);
    });

    it('respects PAGINATION_LIMIT feature flag', async () => {
      featureFlagService.setFlag('PAGINATION_LIMIT', 10);
      const chats = Array.from({ length: 15 }, (_, i) => makeChat(`chat-${i}`));
      chatRepo.findByUserId.mockResolvedValue(chats);

      const result = await service.listChats('user-1', { limit: 100 });

      // Effective limit is min(100, PAGINATION_LIMIT=10)
      expect(result.items).toHaveLength(10);
    });
  });

  describe('getChatHistory', () => {
    it('throws 404 for chat not found', async () => {
      chatRepo.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.getChatHistory('chat-1', 'user-1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('returns full history when CHAT_HISTORY_ENABLED=true', async () => {
      chatRepo.findByIdAndUserId.mockResolvedValue(makeChat('chat-1'));
      const messages = Array.from({ length: 100 }, (_, i) => makeMessage(`msg-${i}`, 'chat-1'));
      messageRepo.findByChatId.mockResolvedValue(messages);

      featureFlagService.setFlag('CHAT_HISTORY_ENABLED', true);
      const result = await service.getChatHistory('chat-1', 'user-1');

      expect(result).toHaveLength(100);
    });

    it('returns limited history when CHAT_HISTORY_ENABLED=false', async () => {
      chatRepo.findByIdAndUserId.mockResolvedValue(makeChat('chat-1'));
      const messages = Array.from({ length: 100 }, (_, i) => makeMessage(`msg-${i}`, 'chat-1'));
      messageRepo.findByChatId.mockResolvedValue(messages);

      featureFlagService.setFlag('CHAT_HISTORY_ENABLED', false);
      const result = await service.getChatHistory('chat-1', 'user-1');

      expect(result).toHaveLength(50);
    });

    it('verifies chat ownership', async () => {
      chatRepo.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.getChatHistory('chat-1', 'wrong-user')).rejects.toBeInstanceOf(ApiError);

      expect(chatRepo.findByIdAndUserId).toHaveBeenCalledWith('chat-1', 'wrong-user');
    });
  });
});
