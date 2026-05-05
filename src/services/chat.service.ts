import { ChatRepository } from '../repositories/chat.repository';
import { MessageRepository } from '../repositories/message.repository';
import { FeatureFlagService } from './feature-flag.service';
import { EventBus } from '../events/event-bus';
import { AppEvent } from '../events/events';
import { HistoryStrategies } from '../strategies/history/history.strategy';
import { ApiError } from '../utils/api-error';
import { PaginatedResult, PaginationOptions } from '../types';
import { Chat, Message } from '@prisma/client';

export type { HistoryStrategies };

export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly messageRepository: MessageRepository,
    private readonly featureFlagService: FeatureFlagService,
    private readonly eventBus: EventBus,
    private readonly historyStrategies: HistoryStrategies,
  ) {}

  async listChats(userId: string, options: PaginationOptions): Promise<PaginatedResult<Chat>> {
    const limit = this.featureFlagService.getFlag<number>('PAGINATION_LIMIT');
    const effectiveLimit = Math.min(options.limit || limit, limit);

    const chats = await this.chatRepository.findByUserId(userId, {
      ...options,
      limit: effectiveLimit,
    });

    const hasMore = chats.length > effectiveLimit;
    const items = hasMore ? chats.slice(0, effectiveLimit) : chats;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
  }

  async getChatHistory(chatId: string, userId: string): Promise<Message[]> {
    const chat = await this.chatRepository.findByIdAndUserId(chatId, userId);
    if (!chat) throw ApiError.notFound('Chat not found');

    const allMessages = await this.messageRepository.findByChatId(chatId);

    const historyEnabled = this.featureFlagService.isEnabled('CHAT_HISTORY_ENABLED');
    const strategy = historyEnabled
      ? this.historyStrategies.full
      : this.historyStrategies.limited;

    return strategy.apply(allMessages);
  }

  async createChat(userId: string, title: string): Promise<Chat> {
    const chat = await this.chatRepository.create(userId, title);
    this.eventBus.emit(AppEvent.CHAT_CREATED, { chatId: chat.id, userId });
    return chat;
  }

  async verifyChatOwnership(chatId: string, userId: string): Promise<Chat> {
    const chat = await this.chatRepository.findByIdAndUserId(chatId, userId);
    if (!chat) throw ApiError.notFound('Chat not found');
    return chat;
  }
}
