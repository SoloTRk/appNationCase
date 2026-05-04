import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  env: string;
  port: number;
  database: { url: string };
  jwt: { secret: string; expiresIn: string };
  openai: { apiKey: string };
  circuitBreaker: { failureThreshold: number; resetTimeout: number };
  rateLimit: { windowMs: number; maxRequests: number };
  logging: { level: string };
}

export class ConfigService {
  private static instance: ConfigService | null = null;
  private readonly config: AppConfig;

  private constructor() {
    this.config = {
      env: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '3000', 10),
      database: {
        url: process.env.DATABASE_URL || '',
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'dev-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
      },
      circuitBreaker: {
        failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5', 10),
        resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10),
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '60', 10),
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
      },
    };
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  get isDevelopment(): boolean {
    return this.config.env === 'development';
  }

  get isProduction(): boolean {
    return this.config.env === 'production';
  }

  get isTest(): boolean {
    return this.config.env === 'test';
  }

  static resetInstance(): void {
    ConfigService.instance = null;
  }
}
