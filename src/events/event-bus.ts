import { EventEmitter } from 'events';
import { AppEvent, EventPayloads } from './events';

type EventHandler<E extends AppEvent> = (payload: EventPayloads[E]) => void;

export class EventBus {
  private static instance: EventBus | null = null;
  private readonly emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(20);
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  emit<E extends AppEvent>(event: E, payload: EventPayloads[E]): void {
    this.emitter.emit(event, payload);
    this.emitter.emit('*', event, payload);
  }

  on<E extends AppEvent>(event: E, handler: EventHandler<E>): void {
    this.emitter.on(event, handler);
  }

  off<E extends AppEvent>(event: E, handler: EventHandler<E>): void {
    this.emitter.off(event, handler);
  }

  onAny(handler: (event: string, payload: unknown) => void): void {
    this.emitter.on('*', handler);
  }

  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }

  static resetInstance(): void {
    if (EventBus.instance) {
      EventBus.instance.removeAllListeners();
      EventBus.instance = null;
    }
  }
}
