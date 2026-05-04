import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';
import { ApiResponse } from '../utils/api-response';
import { Logger } from '../logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const logger = Logger.getInstance();

  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error('Server error', {
        statusCode: err.statusCode,
        message: err.message,
        path: req.path,
        method: req.method,
        stack: err.stack,
      });
    } else {
      logger.warn('Client error', {
        statusCode: err.statusCode,
        message: err.message,
        path: req.path,
        method: req.method,
      });
    }

    res.status(err.statusCode).json(
      ApiResponse.error(err.message, err.details),
    );
    return;
  }

  logger.error('Unhandled error', {
    message: err.message,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json(
    ApiResponse.error(
      'Internal server error',
      isDev ? { stack: err.stack } : undefined,
    ),
  );
}
