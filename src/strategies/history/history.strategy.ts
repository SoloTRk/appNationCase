import { Message } from '@prisma/client';

export interface IHistoryStrategy {
  apply(messages: Message[]): Message[];
}

export interface HistoryStrategies {
  full: IHistoryStrategy;
  limited: IHistoryStrategy;
}
