import { Message } from '@prisma/client';

export interface IHistoryStrategy {
  apply(messages: Message[]): Message[];
}
