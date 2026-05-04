import { Response } from 'express';
import { CoreMessage } from 'ai';

export interface ToolSet {
  [name: string]: unknown;
}

export interface CompletionContext {
  messages: CoreMessage[];
  tools?: ToolSet;
  abortSignal?: AbortSignal;
}

export interface ICompletionStrategy {
  execute(context: CompletionContext, res: Response): Promise<string>;
}
