import { EventBus } from '../events/event-bus';
import { AppEvent } from '../events/events';
import { ApiError } from '../utils/api-error';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  requestTimeout: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeout: 30000,
  requestTimeout: 30000,
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private readonly options: CircuitBreakerOptions;

  constructor(
    private readonly eventBus: EventBus,
    options: Partial<CircuitBreakerOptions> = {},
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async execute<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('HALF_OPEN');
      } else {
        throw ApiError.serviceUnavailable('AI service temporarily unavailable (circuit open)');
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.requestTimeout);

    try {
      const result = await fn(controller.signal);
      clearTimeout(timeout);
      this.onSuccess();
      return result;
    } catch (error) {
      clearTimeout(timeout);
      this.onFailure(error);
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    return (
      this.lastFailureTime !== null &&
      Date.now() - this.lastFailureTime >= this.options.resetTimeout
    );
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.transitionTo('CLOSED');
    }
    this.failureCount = 0;
  }

  private onFailure(error: unknown): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
      return;
    }

    if (this.failureCount >= this.options.failureThreshold) {
      this.transitionTo('OPEN');
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      this.eventBus.emit(AppEvent.COMPLETION_TIMEOUT, {
        chatId: 'unknown',
        timeoutMs: this.options.requestTimeout,
      });
    }
  }

  private transitionTo(newState: CircuitState): void {
    const previousState = this.state;
    this.state = newState;

    switch (newState) {
      case 'OPEN':
        this.eventBus.emit(AppEvent.CIRCUIT_BREAKER_OPENED, {
          failureCount: this.failureCount,
        });
        break;
      case 'CLOSED':
        this.failureCount = 0;
        this.eventBus.emit(AppEvent.CIRCUIT_BREAKER_CLOSED, {
          reason: `Recovered from ${previousState}`,
        });
        break;
      case 'HALF_OPEN':
        this.eventBus.emit(AppEvent.CIRCUIT_BREAKER_HALF_OPEN, {
          testAttempt: 1,
        });
        break;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): { state: CircuitState; failureCount: number; lastFailureTime: number | null } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
  }
}
