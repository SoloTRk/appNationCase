import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';

export function appCheckMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const appCheckToken = req.headers['x-firebase-appcheck'] as string | undefined;

  if (!appCheckToken) {
    next(ApiError.forbidden('Missing Firebase App Check token'));
    return;
  }

  // Mock verification: accept any non-empty token
  // In production, verify with Firebase Admin SDK
  next();
}
