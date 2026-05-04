import { Message } from '@prisma/client';
import { IHistoryStrategy } from './history.strategy';

export class FullHistoryStrategy implements IHistoryStrategy {
  apply(messages: Message[]): Message[] {
    return messages;
  }
}
