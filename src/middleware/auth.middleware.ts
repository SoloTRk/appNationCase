import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ConfigService } from '../config';
import { ApiError } from '../utils/api-error';

interface JwtPayload {
  userId: string;
  email: string;
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(ApiError.unauthorized('Missing or invalid authorization header'));
    return;
  }

  const token = authHeader.substring(7);
  const config = ConfigService.getInstance();

  try {
    const decoded = jwt.verify(token, config.get('jwt').secret) as JwtPayload;
    req.user = { userId: decoded.userId, email: decoded.email };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

export function generateToken(userId: string, email: string): string {
  const config = ConfigService.getInstance();
  return jwt.sign({ userId, email }, config.get('jwt').secret);
}
