import { Response } from 'express';
import { ICompletionStrategy, CompletionContext } from './completion.strategy';
import { ApiResponse } from '../../utils/api-response';
import { generateMockResponse } from './mock-response';

export class MockJsonCompletionStrategy implements ICompletionStrategy {
  async execute(context: CompletionContext, res: Response): Promise<string> {
    await new Promise(r => setTimeout(r, 200));

    const lastUserMessage = [...context.messages].reverse().find(m => m.role === 'user');
    const content = lastUserMessage && typeof lastUserMessage.content === 'string'
      ? lastUserMessage.content
      : '';

    const hasWeatherTool = context.tools && 'getCurrentWeather' in context.tools;
    const isWeatherQuery = /weather|temperature|forecast|clima|hava/i.test(content);

    const text = generateMockResponse(content, !!(hasWeatherTool && isWeatherQuery));

    res.json(ApiResponse.success({
      message: { role: 'assistant' as const, content: text },
      usage: { promptTokens: 45, completionTokens: text.split(' ').length },
    }));

    return text;
  }
}
