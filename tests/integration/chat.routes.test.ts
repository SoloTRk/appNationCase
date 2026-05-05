import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { createContainer } from '../../src/container';
import { createApp } from '../../src/app';

const TEST_SECRET = 'integration-test-secret';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function makeToken(userId = TEST_USER_ID): string {
  return jwt.sign({ userId, email: 'demo@appnation.com' }, TEST_SECRET);
}

const COMMON_HEADERS = {
  'X-Firebase-AppCheck': 'mock-token',
  'X-Client-Type': 'web',
};

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
  process.env.NODE_ENV = 'test';
  process.env.MOCK_AI = 'true';
  // Use real DB if DATABASE_URL is set, otherwise skip DB-dependent tests
});

beforeEach(() => {
  const container = createContainer();
  app = createApp(container);
});

describe('GET /health', () => {
  it('returns healthy status', async () => {
    // Health check may fail if no DB — we just check the route exists
    const res = await supertest(app).get('/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('success');
  });
});

describe('GET /api/feature-flags', () => {
  it('returns all feature flags', async () => {
    const res = await supertest(app).get('/api/feature-flags');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('STREAMING_ENABLED');
    expect(res.body.data).toHaveProperty('PAGINATION_LIMIT');
    expect(res.body.data).toHaveProperty('AI_TOOLS_ENABLED');
    expect(res.body.data).toHaveProperty('CHAT_HISTORY_ENABLED');
  });
});

describe('Authentication middleware', () => {
  it('rejects requests without X-Firebase-AppCheck header', async () => {
    const res = await supertest(app)
      .get('/api/chats')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('rejects requests without Authorization header', async () => {
    const res = await supertest(app)
      .get('/api/chats')
      .set(COMMON_HEADERS);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects requests with invalid JWT', async () => {
    const res = await supertest(app)
      .get('/api/chats')
      .set({ ...COMMON_HEADERS, Authorization: 'Bearer invalid.token.here' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('Validation middleware', () => {
  it('rejects invalid chatId format (non-UUID) on history route', async () => {
    const token = makeToken();
    const res = await supertest(app)
      .get('/api/chats/not-a-uuid/history')
      .set({ ...COMMON_HEADERS, Authorization: `Bearer ${token}` });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects empty message body on completion route', async () => {
    const token = makeToken();
    const res = await supertest(app)
      .post('/api/chats/550e8400-e29b-41d4-a716-446655440000/completion')
      .set({ ...COMMON_HEADERS, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })
      .send({ message: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects missing message body on completion route', async () => {
    const token = makeToken();
    const res = await supertest(app)
      .post('/api/chats/550e8400-e29b-41d4-a716-446655440000/completion')
      .set({ ...COMMON_HEADERS, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('Error response format', () => {
  it('returns consistent error shape', async () => {
    const res = await supertest(app).get('/api/chats').set(COMMON_HEADERS);
    expect(res.body).toMatchObject({
      success: false,
      error: { message: expect.any(String) },
    });
  });
});
