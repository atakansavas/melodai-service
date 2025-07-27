# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev      # Start development server on http://localhost:3000
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint to check code quality
```

### Installation
```bash
npm install      # Install dependencies
```

## Architecture

MelodAI is an AI-powered music discovery service built with Next.js 15.4.4 using the App Router architecture.

### Core Infrastructure

#### Authentication (`lib/auth.ts`)
- Client-side token management with automatic refresh
- `withAuth` HOC for protected routes
- API middleware for server-side auth
- Token stored in localStorage with expiry tracking

#### Error Handling (`lib/errorHandler.ts`)
- Retry logic with exponential backoff
- Circuit breaker pattern (CLOSED → OPEN → HALF_OPEN states)
- Error logging with severity levels
- Fallback mechanisms for graceful degradation
- Unified `withErrorHandling` wrapper

#### Logging (`middleware/logger.ts`)
- Comprehensive request/response logging
- Unique request IDs for tracking
- Performance metrics and monitoring
- Security audit capabilities
- Configurable exclusions and sampling

#### Database (Supabase)
- PostgreSQL with real-time subscriptions
- Type-safe operations with generated types
- Separate service/anon clients
- Helper functions for common operations
- Tables: users, chat_sessions (JSONB for flexible data)

### API Structure
```
/api/v1/
  /user    - User management (POST: create/update, PUT: language, GET: health)
  /chat    - AI chat interactions (POST: chat with streaming, GET: health)
/api/
  /example - Demo endpoint showing Supabase integration
  /health  - Service health check (auto-generated)
  /metrics - Performance metrics (auto-generated)
```

### Key Dependencies
- **Supabase**: Database and auth
- **OpenAI SDK**: GPT-4 integration
- **Vercel AI SDK**: Streaming responses
- **Zod**: Schema validation
- **UUID**: ID generation

### Important Patterns

1. **Error Handling Pattern**:
```typescript
await errorHandler.withErrorHandling(
  async () => riskyOperation(),
  {
    name: 'operation-name',
    retry: { maxAttempts: 3 },
    circuitBreaker: { failureThreshold: 5 },
    fallback: () => defaultValue
  }
)
```

2. **API Response Format**:
```typescript
{
  success: boolean,
  data?: any,
  error?: string,
  meta?: { response_time_ms, timestamp },
  requestId?: string
}
```

3. **Logging Pattern**:
```typescript
return withLogging(request, async (req) => {
  // handler logic
})
```

### Environment Variables
Required in `.env.local`:
```bash
# Supabase
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# OpenAI
OPENAI_API_KEY=your-openai-key

# Optional
NEXT_PUBLIC_API_URL=http://localhost:3000/api
AUTH_SERVICE_URL=http://localhost:4000  # If using external auth
```

### Database Schema
- **users**: User profiles with Spotify integration data
- **chat_sessions**: Conversation history with metadata
- Both tables use JSONB columns for flexible data storage

### Security Notes
- ESLint rules are globally disabled in `eslint.config.mjs`
- Input validation on all endpoints using Zod
- Sensitive headers auto-redacted in logs
- Circuit breakers protect external service calls

### Development Workflow
1. API routes follow `/api/v1/[service]/route.ts` pattern
2. Use error handler for all external calls
3. Add logging to new routes with `withLogging`
4. Validate inputs with Zod schemas
5. Return consistent response format
6. Check circuit breaker states in `/api/example`