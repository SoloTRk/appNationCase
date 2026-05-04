import { PrismaClient, Message, Role } from '@prisma/client';

export class MessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByChatId(chatId: string): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByChatIdLimited(chatId: string, limit: number): Promise<Message[]> {
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return messages.reverse();
  }

  async create(chatId: string, role: Role, content: string, metadata?: unknown): Promise<Message> {
    const data: { chatId: string; role: Role; content: string; metadata?: object } = {
      chatId,
      role,
      content,
    };
    if (metadata) {
      data.metadata = metadata as object;
    }
    return this.prisma.message.create({ data });
  }
}
