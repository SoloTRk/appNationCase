import { Request, Response, NextFunction } from 'express';
import { ClientType } from '../types';

const VALID_CLIENT_TYPES: ClientType[] = ['web', 'mobile', 'desktop'];

export function clientTypeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const clientType = (req.headers['x-client-type'] as string)?.toLowerCase();

  req.clientType = VALID_CLIENT_TYPES.includes(clientType as ClientType)
    ? (clientType as ClientType)
    : 'web';

  next();
}
