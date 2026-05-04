import { Message } from '@prisma/client';
import { IHistoryStrategy } from './history.strategy';

const HISTORY_LIMIT = 50;

export class LimitedHistoryStrategy implements IHistoryStrategy {
  apply(messages: Message[]): Message[] {
    if (messages.length <= HISTORY_LIMIT) return messages;
    return messages.slice(-HISTORY_LIMIT);
  }
}
