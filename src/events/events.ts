export enum AppEvent {
  CHAT_CREATED = 'chat.created',
  MESSAGE_SENT = 'message.sent',

  COMPLETION_STARTED = 'completion.started',
  COMPLETION_COMPLETED = 'completion.completed',
  COMPLETION_FAILED = 'completion.failed',
  COMPLETION_TIMEOUT = 'completion.timeout',

  FEATURE_FLAG_CHANGED = 'feature_flag.changed',

  CIRCUIT_BREAKER_OPENED = 'circuit_breaker.opened',
  CIRCUIT_BREAKER_CLOSED = 'circuit_breaker.closed',
  CIRCUIT_BREAKER_HALF_OPEN = 'circuit_breaker.half_open',
}

export interface EventPayloads {
  [AppEvent.CHAT_CREATED]: { chatId: string; userId: string };
  [AppEvent.MESSAGE_SENT]: { chatId: string; role: string };
  [AppEvent.COMPLETION_STARTED]: { chatId: string; userId: string };
  [AppEvent.COMPLETION_COMPLETED]: { chatId: string; durationMs: number };
  [AppEvent.COMPLETION_FAILED]: { chatId: string; error: string };
  [AppEvent.COMPLETION_TIMEOUT]: { chatId: string; timeoutMs: number };
  [AppEvent.FEATURE_FLAG_CHANGED]: { flag: string; oldValue: unknown; newValue: unknown };
  [AppEvent.CIRCUIT_BREAKER_OPENED]: { failureCount: number };
  [AppEvent.CIRCUIT_BREAKER_CLOSED]: { reason: string };
  [AppEvent.CIRCUIT_BREAKER_HALF_OPEN]: { testAttempt: number };
}
