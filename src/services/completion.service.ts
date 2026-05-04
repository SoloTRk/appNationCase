import { Response } from 'express';
import { Role, Message } from '@prisma/client';
import { CoreMessage } from 'ai';
import { MessageRepository } from '../repositories/message.repository';
import { FeatureFlagService } from './feature-flag.service';
import { ChatService } from './chat.service';
import { EventBus } from '../events/event-bus';
import { AppEvent } from '../events/events';
import { CircuitBreaker } from '../resilience/circuit-breaker';
import { ICompletionStrategy } from '../strategies/completion/completion.strategy';
import { IHistoryStrategy } from '../strategies/history/history.strategy';
import { IToolStrategy } from '../strategies/tools/tool.strategy';

export interface CompletionStrategies {
  streaming: ICompletionStrategy;
  json: ICompletionStrategy;
}

export interface HistoryStrategies {
  full: IHistoryStrategy;
  limited: IHistoryStrategy;
}

export interface ToolStrategies {
  enabled: IToolStrategy;
  disabled: IToolStrategy;
}

export class CompletionService {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly featureFlagService: FeatureFlagService,
    private readonly chatService: ChatService,
    private readonly completionStrategies: CompletionStrategies,
    private readonly historyStrategies: HistoryStrategies,
    private readonly toolStrategies: ToolStrategies,
    private readonly eventBus: EventBus,
    private readonly circuitBreaker: CircuitBreaker,
  ) {}

  async handleCompletion(chatId: string, userId: string, userMessage: string, res: Response): Promise<void> {
    await this.chatService.verifyChatOwnership(chatId, userId);

    await this.messageRepository.create(chatId, Role.user, userMessage);
    this.eventBus.emit(AppEvent.MESSAGE_SENT, { chatId, role: 'user' });

    const startTime = Date.now();
    this.eventBus.emit(AppEvent.COMPLETION_STARTED, { chatId, userId });

    const streamingEnabled = this.featureFlagService.isEnabled('STREAMING_ENABLED');
    const toolsEnabled = this.featureFlagService.isEnabled('AI_TOOLS_ENABLED');
    const historyEnabled = this.featureFlagService.isEnabled('CHAT_HISTORY_ENABLED');

    const completionStrategy = streamingEnabled
      ? this.completionStrategies.streaming
      : this.completionStrategies.json;

    const toolStrategy = toolsEnabled
      ? this.toolStrategies.enabled
      : this.toolStrategies.disabled;

    const historyStrategy = historyEnabled
      ? this.historyStrategies.full
      : this.historyStrategies.limited;

    const allMessages = await this.messageRepository.findByChatId(chatId);
    const contextMessages = historyStrategy.apply(allMessages);

    const coreMessages: CoreMessage[] = contextMessages.map((msg: Message) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    const tools = toolStrategy.getTools();

    try {
      const assistantContent = await this.circuitBreaker.execute(async (signal) => {
        return completionStrategy.execute(
          { messages: coreMessages, tools, abortSignal: signal },
          res,
        );
      });

      if (assistantContent) {
        await this.messageRepository.create(chatId, Role.assistant, assistantContent);
        this.eventBus.emit(AppEvent.MESSAGE_SENT, { chatId, role: 'assistant' });
      }

      this.eventBus.emit(AppEvent.COMPLETION_COMPLETED, {
        chatId,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      this.eventBus.emit(AppEvent.COMPLETION_FAILED, {
        chatId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
