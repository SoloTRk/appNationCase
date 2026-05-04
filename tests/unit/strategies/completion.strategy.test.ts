import { FullHistoryStrategy } from '../../../src/strategies/history/full-history.strategy';
import { LimitedHistoryStrategy } from '../../../src/strategies/history/limited-history.strategy';
import { ToolsEnabledStrategy } from '../../../src/strategies/tools/tools-enabled.strategy';
import { ToolsDisabledStrategy } from '../../../src/strategies/tools/tools-disabled.strategy';
import { Message, Role } from '@prisma/client';

function makeMessages(count: number): Message[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    chatId: 'chat-1',
    role: i % 2 === 0 ? Role.user : Role.assistant,
    content: `Message ${i}`,
    metadata: null,
    createdAt: new Date(Date.now() + i * 1000),
  }));
}

describe('FullHistoryStrategy', () => {
  const strategy = new FullHistoryStrategy();

  it('returns all messages unchanged', () => {
    const messages = makeMessages(100);
    expect(strategy.apply(messages)).toHaveLength(100);
    expect(strategy.apply(messages)).toBe(messages);
  });

  it('returns empty array for no messages', () => {
    expect(strategy.apply([])).toHaveLength(0);
  });
});

describe('LimitedHistoryStrategy', () => {
  const strategy = new LimitedHistoryStrategy();

  it('returns all messages when under limit', () => {
    const messages = makeMessages(20);
    expect(strategy.apply(messages)).toHaveLength(20);
  });

  it('returns last 50 when over limit', () => {
    const messages = makeMessages(80);
    const result = strategy.apply(messages);
    expect(result).toHaveLength(50);
    expect(result[0].content).toBe('Message 30');
    expect(result[result.length - 1].content).toBe('Message 79');
  });

  it('preserves order (oldest first)', () => {
    const messages = makeMessages(60);
    const result = strategy.apply(messages);
    expect(result.length).toBe(50);
    // Should be in original order (asc)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].createdAt <= result[i + 1].createdAt).toBe(true);
    }
  });
});

describe('ToolsEnabledStrategy', () => {
  const strategy = new ToolsEnabledStrategy();

  it('returns a non-empty tool set', () => {
    const tools = strategy.getTools();
    expect(tools).toBeDefined();
    expect(Object.keys(tools!)).toContain('getCurrentWeather');
  });
});

describe('ToolsDisabledStrategy', () => {
  const strategy = new ToolsDisabledStrategy();

  it('returns undefined', () => {
    expect(strategy.getTools()).toBeUndefined();
  });
});
