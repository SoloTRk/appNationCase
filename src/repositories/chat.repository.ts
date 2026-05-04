import { PrismaClient, Chat } from '@prisma/client';
import { PaginationOptions } from '../types';

export class ChatRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: string, options: PaginationOptions): Promise<Chat[]> {
    return this.prisma.chat.findMany({
      where: { userId },
      take: options.limit + 1,
      ...(options.cursor && {
        cursor: { id: options.cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true },
        },
      },
    });
  }

  async findByIdAndUserId(chatId: string, userId: string): Promise<Chat | null> {
    return this.prisma.chat.findFirst({
      where: { id: chatId, userId },
    });
  }

  async create(userId: string, title: string): Promise<Chat> {
    return this.prisma.chat.create({
      data: { title, userId },
    });
  }
}
