import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@appnation.com' },
    update: {},
    create: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'demo@appnation.com',
      name: 'Demo User',
      tier: 'premium',
    },
  });

  const chats = [
    { title: 'Weather Assistant', messages: [
      { role: Role.user, content: 'What is the weather like in Istanbul?' },
      { role: Role.assistant, content: 'I can check the weather for you! Currently in Istanbul, it\'s partly cloudy with a temperature of 22°C.' },
      { role: Role.user, content: 'What about Ankara?' },
      { role: Role.assistant, content: 'In Ankara, it\'s sunny with a temperature of 18°C and low humidity.' },
    ]},
    { title: 'Code Review Help', messages: [
      { role: Role.user, content: 'Can you review my Express middleware implementation?' },
      { role: Role.assistant, content: 'I\'d be happy to review your Express middleware. Please share the code and I\'ll provide feedback on patterns, error handling, and best practices.' },
    ]},
    { title: 'Architecture Discussion', messages: [
      { role: Role.user, content: 'What are the best patterns for a feature flagging system?' },
      { role: Role.assistant, content: 'For a feature flagging system, I recommend using the Strategy pattern combined with a Singleton configuration manager. This allows runtime behavior changes without code modifications.' },
      { role: Role.user, content: 'How does the Strategy pattern apply here?' },
      { role: Role.assistant, content: 'Each feature flag maps to a strategy interface with multiple implementations. At runtime, the active flag value selects the concrete strategy, enabling clean behavior switching without if/else chains.' },
      { role: Role.user, content: 'What about the Circuit Breaker pattern?' },
      { role: Role.assistant, content: 'Circuit Breaker protects your system from cascading failures. It has three states: Closed (normal), Open (failing fast), and Half-Open (testing recovery). Essential for external API dependencies like AI services.' },
    ]},
  ];

  for (const chat of chats) {
    const createdChat = await prisma.chat.create({
      data: {
        title: chat.title,
        userId: user.id,
      },
    });

    for (let i = 0; i < chat.messages.length; i++) {
      await prisma.message.create({
        data: {
          chatId: createdChat.id,
          role: chat.messages[i].role,
          content: chat.messages[i].content,
          createdAt: new Date(Date.now() - (chat.messages.length - i) * 60000),
        },
      });
    }
  }

  console.log(`Seeded: 1 user, ${chats.length} chats with messages`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
