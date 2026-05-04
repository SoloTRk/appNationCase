import { Request, Response, NextFunction } from 'express';
import { Logger } from '../logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const logger = Logger.getInstance();
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      clientType: req.clientType || 'unknown',
      userId: req.user?.userId,
      userAgent: req.headers['user-agent'],
    };

    if (res.statusCode >= 500) {
      logger.error('Request completed with server error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
}
