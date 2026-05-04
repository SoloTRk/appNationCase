import winston from 'winston';

export class Logger {
  private static instance: winston.Logger | null = null;

  private constructor() {}

  static getInstance(): winston.Logger {
    if (!Logger.instance) {
      const isProduction = process.env.NODE_ENV === 'production';

      Logger.instance = winston.createLogger({
        level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.errors({ stack: true }),
          isProduction
            ? winston.format.json()
            : winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                  return `${timestamp} [${level}]: ${message}${metaStr}`;
                }),
              ),
        ),
        defaultMeta: { service: 'ai-chat-backend' },
        transports: [
          new winston.transports.Console(),
          ...(isProduction
            ? [
                new winston.transports.File({
                  filename: 'logs/error.log',
                  level: 'error',
                  maxsize: 5242880,
                  maxFiles: 5,
                }),
              ]
            : []),
        ],
      });
    }
    return Logger.instance;
  }

  static resetInstance(): void {
    Logger.instance = null;
  }
}
