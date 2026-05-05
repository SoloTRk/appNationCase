# AI Chat System Backend

A production-grade AI-powered chat backend built for App Nation's Senior Software Engineer case study.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Express.js API                        │
├─────────────────────────────────────────────────────────┤
│  Middleware Chain (per-route)                            │
│  Firebase AppCheck → JWT Auth → Client Type             │
│  → Validation → Rate Limiter → Feature Check            │
├─────────────────────────────────────────────────────────┤
│  Controllers (thin layer, no business logic)            │
├─────────────────────────────────────────────────────────┤
│  Services + Strategy Pattern                            │
│  CompletionService → CircuitBreaker → AI SDK (SSE/JSON) │
├─────────────────────────────────────────────────────────┤
│  Repositories (Prisma + PostgreSQL)                     │
├─────────────────────────────────────────────────────────┤
│  Infrastructure: EventBus | Logger | FeatureFlags        │
└─────────────────────────────────────────────────────────┘
```

## Design Patterns

| Pattern | Where |
|---|---|
| **Dependency Injection** | `src/container.ts` — manual composition root |
| **Service Pattern** | `src/services/` — all business logic |
| **Repository Pattern** | `src/repositories/` — all DB access |
| **Singleton Pattern** | Database, Config, Logger, EventBus, FeatureFlagManager |
| **Strategy Pattern** | Completion (SSE/JSON), History (full/limited), Tools (on/off) |
| **Circuit Breaker** | `src/resilience/circuit-breaker.ts` — AI API resilience |
| **Event-Driven** | `src/events/event-bus.ts` — decoupled domain events |
| **Observer Pattern** | EventBus subscribers (Logger, CircuitBreaker) |

## Quick Start

### Prerequisites
- Node.js >= 20
- Docker & Docker Compose (for PostgreSQL)

### 1. Environment Setup

```bash
cp .env.example .env
# Edit .env and set your values (DATABASE_URL, JWT_SECRET, etc.)
# Optional: set OPENAI_API_KEY for real AI responses
# Leave MOCK_AI=true for demo mode (simulated responses, no API key required)
```

### 2. Start Database

```bash
docker-compose up -d db
```

### 3. Install & Initialize

```bash
npm install
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed test data (1 user, 3 chats)
```

### 4. Start Server

```bash
npm run dev          # Development (hot reload)
npm run build && npm start  # Production
```

Server runs at `http://localhost:3000`

### 5. Run with Docker (full stack)

```bash
docker-compose up --build
```

---

## API Endpoints

### Authentication

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
X-Firebase-AppCheck: <any-non-empty-string>   # Mock in dev
X-Client-Type: web | mobile | desktop          # Optional, defaults to "web"
```

Generate a token for the seeded demo user:
```bash
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: '550e8400-e29b-41d4-a716-446655440000', email: 'demo@appnation.com' },
  'your-secret-key'
);
console.log(token);
"
```

---

### GET /api/chats
List user's chats with cursor-based pagination.

**Query Params:** `cursor` (optional UUID), `limit` (optional, overridden by PAGINATION_LIMIT flag)

```bash
curl -X GET http://localhost:3000/api/chats \
  -H "Authorization: Bearer <token>" \
  -H "X-Firebase-AppCheck: mock-token" \
  -H "X-Client-Type: web"
```

**Response:**
```json
{
  "success": true,
  "data": [{ "id": "...", "title": "...", "userId": "...", "createdAt": "..." }],
  "pagination": { "nextCursor": null, "hasMore": false }
}
```

---

### GET /api/chats/:chatId/history
Get message history for a specific chat.

```bash
curl -X GET http://localhost:3000/api/chats/<chatId>/history \
  -H "Authorization: Bearer <token>" \
  -H "X-Firebase-AppCheck: mock-token"
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "...", "role": "user", "content": "Hello", "createdAt": "..." },
    { "id": "...", "role": "assistant", "content": "Hi there!", "createdAt": "..." }
  ]
}
```

---

### POST /api/chats/:chatId/completion
Send a message and get AI completion. Behavior changes based on `STREAMING_ENABLED` flag.

```bash
curl -X POST http://localhost:3000/api/chats/<chatId>/completion \
  -H "Authorization: Bearer <token>" \
  -H "X-Firebase-AppCheck: mock-token" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather in Istanbul?"}'
```

**When `STREAMING_ENABLED=true` (SSE):**
```
event: thinking
data: {"status":"processing"}

event: text-delta
data: {"text":"The weather in Istanbul"}

event: tool_execution
data: {"name":"getCurrentWeather","input":{"location":"Istanbul","unit":"celsius"}}

event: tool_result
data: {"name":"getCurrentWeather","output":{"temperature":22,"condition":"Sunny"}}

event: done
data: {"status":"completed"}
```

**When `STREAMING_ENABLED=false` (JSON):**
```json
{
  "success": true,
  "data": {
    "message": { "role": "assistant", "content": "The weather in Istanbul is 22°C and Sunny." },
    "usage": { "promptTokens": 45, "completionTokens": 20 }
  }
}
```

---

### GET /health
Health check endpoint.

```bash
curl http://localhost:3000/health
```

---

### GET /api/feature-flags
View current feature flag values.

```bash
curl http://localhost:3000/api/feature-flags
```

---

## Feature Flags

Feature flags are controlled via `feature-flags.json` in the project root. **Changes take effect immediately without restart** (file watcher detects changes).

| Flag | Type | Default | Description |
|---|---|---|---|
| `STREAMING_ENABLED` | boolean | `true` | SSE stream vs JSON response for completion |
| `PAGINATION_LIMIT` | number | `20` | Max items in chat list (range: 10-100) |
| `AI_TOOLS_ENABLED` | boolean | `true` | Enable mocked tool support (getCurrentWeather) |
| `CHAT_HISTORY_ENABLED` | boolean | `true` | Full history vs last 50 messages |

### Mock AI Mode

When no real OpenAI API key is available, set `MOCK_AI=true` in `.env` (or leave `OPENAI_API_KEY` unset). The system automatically uses simulated strategies that produce realistic SSE streams and JSON responses — all patterns, middleware, and circuit breaker behavior remain fully exercised.

```bash
MOCK_AI=true   # auto-detected if OPENAI_API_KEY is missing or placeholder
```

### Runtime Flag Change (No Restart)

```bash
# Disable streaming - returns JSON instead of SSE
echo '{"STREAMING_ENABLED": false, "PAGINATION_LIMIT": 20, "AI_TOOLS_ENABLED": true, "CHAT_HISTORY_ENABLED": true}' > feature-flags.json

# Re-enable
echo '{"STREAMING_ENABLED": true, "PAGINATION_LIMIT": 20, "AI_TOOLS_ENABLED": true, "CHAT_HISTORY_ENABLED": true}' > feature-flags.json
```

You can also override via environment variables (prefix `FF_`):
```
FF_STREAMING_ENABLED=false
FF_PAGINATION_LIMIT=10
```

---

## Circuit Breaker

The AI completion endpoint is protected by a Circuit Breaker with 3 states:

| State | Behavior |
|---|---|
| **CLOSED** | Normal operation, requests flow through |
| **OPEN** | After 5 consecutive failures, returns `503` immediately |
| **HALF_OPEN** | After 30s, allows 1 test request to check recovery |

Configuration via `.env`:
```
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RESET_TIMEOUT=30000
```

---

## Event-Driven Architecture

The system uses a central `EventBus` for decoupled communication:

| Event | Emitter | Listeners |
|---|---|---|
| `completion.started` | CompletionService | Logger |
| `completion.completed` | CompletionService | Logger |
| `completion.failed` | CompletionService | Logger, CircuitBreaker |
| `feature_flag.changed` | FeatureFlagManager | Logger |
| `circuit_breaker.opened` | CircuitBreaker | Logger |
| `chat.created` | ChatService | Logger |

---

## Testing

```bash
npm test                  # Run all tests
npm run test:coverage     # With coverage report
```

**53 tests** covering:

*Unit tests (44):*
- FeatureFlagService (flag reads, updates, validation)
- CircuitBreaker (state transitions, threshold, events)
- Strategy Pattern (history, tools)
- ChatService (pagination, ownership, flag integration)
- Auth middleware (JWT validation)
- Validation middleware (Zod schemas)

*Integration tests (9):*
- Full middleware chain (AppCheck → Auth → ClientType → Validate → RateLimit → FeatureCheck)
- Authentication rejection cases (missing/invalid JWT, missing AppCheck)
- Validation error format and HTTP status codes
- Feature flags endpoint
- Consistent error response shape

---

## Project Structure

```
src/
├── index.ts              # Entry point
├── app.ts                # Express app factory
├── container.ts          # DI composition root
├── config/               # Config + Feature Flag Manager
├── database/             # Prisma singleton
├── logger/               # Winston logger singleton
├── events/               # EventBus + domain events
├── resilience/           # Circuit Breaker
├── middleware/           # Middleware chain (6 middlewares)
├── strategies/           # Strategy pattern (3 axes)
├── repositories/         # Data access layer
├── services/             # Business logic
├── controllers/          # Request handling (thin)
├── routes/               # Route definitions (per-route middleware)
├── tools/                # Mocked AI tools
└── validators/           # Zod schemas
```
