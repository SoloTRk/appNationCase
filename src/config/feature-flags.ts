import fs from 'fs';
import path from 'path';
import { EventBus } from '../events/event-bus';
import { AppEvent } from '../events/events';

type FlagType = 'boolean' | 'number';
type FlagValue = boolean | number;

interface FlagDefinition {
  key: string;
  type: FlagType;
  defaultValue: FlagValue;
  description: string;
  validate?: (value: FlagValue) => boolean;
}

const FLAG_DEFINITIONS: FlagDefinition[] = [
  {
    key: 'STREAMING_ENABLED',
    type: 'boolean',
    defaultValue: true,
    description: 'When true, completion returns SSE stream; when false, returns JSON',
  },
  {
    key: 'PAGINATION_LIMIT',
    type: 'number',
    defaultValue: 20,
    description: 'Max items returned in chat list (range: 10-100)',
    validate: (v) => typeof v === 'number' && v >= 10 && v <= 100,
  },
  {
    key: 'AI_TOOLS_ENABLED',
    type: 'boolean',
    defaultValue: true,
    description: 'When true, AI can use tools (e.g., getCurrentWeather)',
  },
  {
    key: 'CHAT_HISTORY_ENABLED',
    type: 'boolean',
    defaultValue: true,
    description: 'When true, returns full history; when false, returns last N messages',
  },
];

export class FeatureFlagManager {
  private static instance: FeatureFlagManager | null = null;
  private flags: Map<string, FlagValue> = new Map();
  private readonly definitions: Map<string, FlagDefinition> = new Map();
  private readonly configPath: string;
  private eventBus: EventBus | null = null;

  private constructor() {
    this.configPath = path.resolve(process.cwd(), 'feature-flags.json');

    for (const def of FLAG_DEFINITIONS) {
      this.definitions.set(def.key, def);
      this.flags.set(def.key, def.defaultValue);
    }

    this.loadFromEnv();
    this.loadFromFile();
    this.watchConfigFile();
  }

  static getInstance(eventBus?: EventBus): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    if (eventBus) {
      FeatureFlagManager.instance.eventBus = eventBus;
    }
    return FeatureFlagManager.instance;
  }

  getFlag<T extends FlagValue>(key: string): T {
    const value = this.flags.get(key);
    if (value === undefined) {
      const def = this.definitions.get(key);
      if (def) return def.defaultValue as T;
      throw new Error(`Unknown feature flag: ${key}`);
    }
    return value as T;
  }

  isEnabled(key: string): boolean {
    return this.getFlag<boolean>(key);
  }

  getAllFlags(): Record<string, FlagValue> {
    const result: Record<string, FlagValue> = {};
    for (const [key, value] of this.flags) {
      result[key] = value;
    }
    return result;
  }

  getDefinitions(): FlagDefinition[] {
    return Array.from(this.definitions.values());
  }

  setFlag(key: string, value: FlagValue): void {
    const def = this.definitions.get(key);
    if (!def) throw new Error(`Unknown feature flag: ${key}`);

    if (typeof value !== def.type) {
      throw new Error(`Invalid type for ${key}: expected ${def.type}, got ${typeof value}`);
    }

    if (def.validate && !def.validate(value)) {
      throw new Error(`Validation failed for ${key}: ${value}`);
    }

    const oldValue = this.flags.get(key);
    this.flags.set(key, value);

    if (oldValue !== value && this.eventBus) {
      this.eventBus.emit(AppEvent.FEATURE_FLAG_CHANGED, {
        flag: key,
        oldValue,
        newValue: value,
      });
    }
  }

  reload(): void {
    this.loadFromFile();
  }

  private loadFromEnv(): void {
    for (const def of this.definitions.values()) {
      const envKey = `FF_${def.key}`;
      const envValue = process.env[envKey];

      if (envValue !== undefined) {
        const parsed = this.parseValue(envValue, def.type);
        if (parsed !== null && (!def.validate || def.validate(parsed))) {
          this.flags.set(def.key, parsed);
        }
      }
    }
  }

  private loadFromFile(): void {
    try {
      if (!fs.existsSync(this.configPath)) return;

      const content = fs.readFileSync(this.configPath, 'utf-8');
      const parsed = JSON.parse(content) as Record<string, unknown>;

      for (const [key, value] of Object.entries(parsed)) {
        const def = this.definitions.get(key);
        if (!def) continue;
        if (typeof value !== def.type) continue;
        if (def.validate && !def.validate(value as FlagValue)) continue;

        const oldValue = this.flags.get(key);
        this.flags.set(key, value as FlagValue);

        if (oldValue !== value && this.eventBus) {
          this.eventBus.emit(AppEvent.FEATURE_FLAG_CHANGED, {
            flag: key,
            oldValue,
            newValue: value,
          });
        }
      }
    } catch {
      // Config file missing or invalid - use defaults/env values
    }
  }

  private watchConfigFile(): void {
    if (process.env.NODE_ENV === 'test') return;

    try {
      fs.watchFile(this.configPath, { interval: 2000 }, () => {
        this.loadFromFile();
      });
    } catch {
      // File watching not supported - flags still work via env/defaults
    }
  }

  private parseValue(value: string, type: FlagType): FlagValue | null {
    switch (type) {
      case 'boolean':
        if (value === 'true') return true;
        if (value === 'false') return false;
        return null;
      case 'number': {
        const num = parseInt(value, 10);
        return isNaN(num) ? null : num;
      }
      default:
        return null;
    }
  }

  static resetInstance(): void {
    if (FeatureFlagManager.instance) {
      try {
        fs.unwatchFile(FeatureFlagManager.instance.configPath);
      } catch { /* ignore */ }
      FeatureFlagManager.instance = null;
    }
  }
}
