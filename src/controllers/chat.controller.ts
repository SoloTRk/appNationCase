import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chat.service';
import { CompletionService } from '../services/completion.service';
import { FeatureFlagService } from '../services/feature-flag.service';
import { ApiResponse } from '../utils/api-response';

export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly completionService: CompletionService,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  listChats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const rawCursor = req.query.cursor;
      const cursor = typeof rawCursor === 'string' ? rawCursor : undefined;
      const rawLimit = req.query.limit;
      const limit = typeof rawLimit === 'string' && rawLimit
        ? parseInt(rawLimit, 10)
        : this.featureFlagService.getFlag<number>('PAGINATION_LIMIT');

      const result = await this.chatService.listChats(userId, { cursor, limit });

      res.json(ApiResponse.paginated(result.items, {
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      }));
    } catch (error) {
      next(error);
    }
  };

  getChatHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const chatId = req.params['chatId'] as string;

      const messages = await this.chatService.getChatHistory(chatId, userId);

      res.json(ApiResponse.success(messages));
    } catch (error) {
      next(error);
    }
  };

  completion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const chatId = req.params['chatId'] as string;
      const { message } = req.body;

      await this.completionService.handleCompletion(chatId, userId, message, res);
    } catch (error) {
      // SSE stream already ended: error was sent as SSE event, no HTTP response possible.
      if (!res.headersSent) {
        next(error);
      }
    }
  };
}
