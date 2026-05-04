import { PrismaClient } from '@prisma/client';

export class Database {
  private static instance: PrismaClient | null = null;

  private constructor() {}

  static getInstance(): PrismaClient {
    if (!Database.instance) {
      Database.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development'
          ? ['query', 'warn', 'error']
          : ['warn', 'error'],
      });
    }
    return Database.instance;
  }

  static async connect(): Promise<void> {
    const client = Database.getInstance();
    await client.$connect();
  }

  static async disconnect(): Promise<void> {
    if (Database.instance) {
      await Database.instance.$disconnect();
      Database.instance = null;
    }
  }
}
