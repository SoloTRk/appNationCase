import { Response } from 'express';
import { streamText, ToolSet as AiToolSet } from 'ai';
import { openai } from '@ai-sdk/openai';
import { ICompletionStrategy, CompletionContext } from './completion.strategy';

export class StreamingCompletionStrategy implements ICompletionStrategy {
  async execute(context: CompletionContext, res: Response): Promise<string> {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    this.sendEvent(res, 'thinking', { status: 'processing' });

    let fullText = '';

    try {
      const result = streamText({
        model: openai('gpt-4o-mini'),
        messages: context.messages,
        tools: context.tools as AiToolSet | undefined,
        abortSignal: context.abortSignal,
      });

      for await (const part of result.fullStream) {
        switch (part.type) {
          case 'text-delta':
            fullText += part.text;
            this.sendEvent(res, 'text-delta', { text: part.text });
            break;
          case 'tool-call':
            this.sendEvent(res, 'tool_execution', {
              name: part.toolName,
              input: 'input' in part ? part.input : undefined,
            });
            break;
          case 'tool-result':
            this.sendEvent(res, 'tool_result', {
              name: part.toolName,
              output: 'output' in part ? part.output : undefined,
            });
            break;
          case 'finish-step':
            this.sendEvent(res, 'done', { status: 'completed' });
            break;
          case 'error':
            this.sendEvent(res, 'error', { message: 'Stream error occurred' });
            break;
        }
      }
    } catch (error) {
      const message = error instanceof Error && error.name === 'AbortError'
        ? 'Request timed out'
        : 'Completion failed';
      this.sendEvent(res, 'error', { message });
    } finally {
      res.end();
    }

    return fullText;
  }

  private sendEvent(res: Response, event: string, data: unknown): void {
    if (!res.writableEnded) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  }
}
