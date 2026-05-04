import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '../utils/api-response';

export class HealthController {
  constructor(private readonly prisma: PrismaClient) {}

  check = async (_req: Request, res: Response): Promise<void> => {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      res.json(ApiResponse.success({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      }));
    } catch {
      res.status(503).json(ApiResponse.error('Database connection failed'));
    }
  };
}
