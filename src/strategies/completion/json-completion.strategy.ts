import { Response } from 'express';
import { generateText, ToolSet as AiToolSet } from 'ai';
import { openai } from '@ai-sdk/openai';
import { ICompletionStrategy, CompletionContext } from './completion.strategy';
import { ApiResponse } from '../../utils/api-response';

export class JsonCompletionStrategy implements ICompletionStrategy {
  async execute(context: CompletionContext, res: Response): Promise<string> {
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      messages: context.messages,
      tools: context.tools as AiToolSet | undefined,
      abortSignal: context.abortSignal,
    });

    const responseData = {
      message: {
        role: 'assistant' as const,
        content: result.text,
      },
      usage: result.usage,
      ...(result.toolResults && result.toolResults.length > 0 && {
        toolResults: result.toolResults,
      }),
    };

    res.json(ApiResponse.success(responseData));

    return result.text;
  }
}
