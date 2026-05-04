import { CircuitBreaker } from '../../../src/resilience/circuit-breaker';
import { EventBus } from '../../../src/events/event-bus';
import { ApiError } from '../../../src/utils/api-error';

describe('CircuitBreaker', () => {
  let eventBus: EventBus;
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    EventBus.resetInstance();
    eventBus = EventBus.getInstance();
    circuitBreaker = new CircuitBreaker(eventBus, {
      failureThreshold: 3,
      resetTimeout: 1000,
      requestTimeout: 5000,
    });
  });

  afterEach(() => {
    EventBus.resetInstance();
  });

  it('starts in CLOSED state', () => {
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });

  it('executes function successfully in CLOSED state', async () => {
    const result = await circuitBreaker.execute(async () => 'success');
    expect(result).toBe('success');
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });

  it('transitions to OPEN after failure threshold', async () => {
    const failFn = async () => { throw new Error('Service error'); };

    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(failFn)).rejects.toThrow('Service error');
    }

    expect(circuitBreaker.getState()).toBe('OPEN');
  });

  it('throws 503 immediately when OPEN', async () => {
    // Trip the circuit
    const failFn = async () => { throw new Error('Service error'); };
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
    }

    // Should now throw 503
    await expect(circuitBreaker.execute(async () => 'ok')).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it('transitions to HALF_OPEN after reset timeout', async () => {
    const failFn = async () => { throw new Error('Service error'); };
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
    }
    expect(circuitBreaker.getState()).toBe('OPEN');

    // Manually set lastFailureTime to past reset timeout
    const stats = circuitBreaker.getStats();
    Object.assign(circuitBreaker, { lastFailureTime: stats.lastFailureTime! - 2000 });

    // Next execute should try half-open
    await expect(circuitBreaker.execute(async () => 'recovery')).resolves.toBe('recovery');
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });

  it('resets failure count on success', async () => {
    const failFn = async () => { throw new Error('error'); };
    await expect(circuitBreaker.execute(failFn)).rejects.toThrow();

    await circuitBreaker.execute(async () => 'ok');
    expect(circuitBreaker.getStats().failureCount).toBe(0);
  });

  it('emits events on state transitions', async () => {
    const events: string[] = [];
    eventBus.onAny((event) => events.push(event as string));

    const failFn = async () => { throw new Error('error'); };
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
    }

    expect(events).toContain('circuit_breaker.opened');
  });

  it('can be manually reset', () => {
    circuitBreaker.reset();
    expect(circuitBreaker.getState()).toBe('CLOSED');
    expect(circuitBreaker.getStats().failureCount).toBe(0);
  });

  it('throws ApiError.serviceUnavailable as actual ApiError', async () => {
    const failFn = async () => { throw new Error('error'); };
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
    }

    try {
      await circuitBreaker.execute(async () => 'ok');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).statusCode).toBe(503);
    }
  });
});
