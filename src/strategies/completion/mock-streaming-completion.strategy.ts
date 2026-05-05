import { Response } from 'express';
import { ICompletionStrategy, CompletionContext } from './completion.strategy';
import { generateMockResponse } from './mock-response';

export class MockStreamingCompletionStrategy implements ICompletionStrategy {
  async execute(context: CompletionContext, res: Response): Promise<string> {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    this.sendEvent(res, 'thinking', { status: 'processing' });
    await this.delay(300);

    const lastUserMessage = [...context.messages].reverse().find(m => m.role === 'user');
    const content = lastUserMessage && typeof lastUserMessage.content === 'string'
      ? lastUserMessage.content
      : '';

    const hasWeatherTool = context.tools && 'getCurrentWeather' in context.tools;
    const isWeatherQuery = /weather|temperature|forecast|clima|hava/i.test(content);

    if (hasWeatherTool && isWeatherQuery) {
      const location = this.extractLocation(content);
      this.sendEvent(res, 'tool_execution', {
        name: 'getCurrentWeather',
        input: { location, unit: 'celsius' },
      });
      await this.delay(400);

      this.sendEvent(res, 'tool_result', {
        name: 'getCurrentWeather',
        output: { temperature: 22, condition: 'Sunny', humidity: 55, windSpeed: 15 },
      });
      await this.delay(200);
    }

    const fullText = generateMockResponse(content, !!(hasWeatherTool && isWeatherQuery));
    const words = fullText.split(' ');

    for (let i = 0; i < words.length; i++) {
      const chunk = i === 0 ? words[i] : ' ' + words[i];
      this.sendEvent(res, 'text-delta', { text: chunk });
      await this.delay(30 + Math.random() * 20);
    }

    this.sendEvent(res, 'done', { status: 'completed' });
    res.end();

    return fullText;
  }

  private extractLocation(text: string): string {
    const match = text.match(/in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    return match ? match[1] : 'Istanbul';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private sendEvent(res: Response, event: string, data: unknown): void {
    if (!res.writableEnded) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  }
}
