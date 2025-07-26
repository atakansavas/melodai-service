# MelodAI Service - Core Features Documentation

This document describes the 4 core features that have been implemented in the MelodAI Next.js + Tailwind project.

## 1. Authentication System (`lib/auth.ts`)

### Features:
- **Token Management**: Automatic token storage and retrieval
- **Token Refresh**: Automatic refresh when tokens expire
- **Authenticated Requests**: Helper method for making authenticated API calls
- **HOC for Protected Routes**: `withAuth` component wrapper
- **API Route Protection**: Middleware for securing API endpoints

### Usage:

```typescript
// Configure auth (optional)
import { configureAuth } from '@/lib/auth';

configureAuth({
  baseURL: 'https://api.example.com',
  onTokenRefresh: (token) => console.log('Token refreshed'),
  onAuthError: (error) => console.error('Auth error', error)
});

// Make authenticated requests
import { authManager } from '@/lib/auth';

const response = await authManager.authenticatedFetch('/api/data');

// Protect pages
import { withAuth } from '@/components/withAuth';

export default withAuth(YourComponent, {
  redirectTo: '/login',
  fallback: <LoadingSpinner />
});

// Protect API routes
import { createAuthMiddleware } from '@/middleware/authMiddleware';

const authMiddleware = createAuthMiddleware({
  publicPaths: ['/api/public'],
  tokenValidator: async (token) => validateJWT(token)
});
```

## 2. Request/Response Logging (`middleware/logger.ts`)

### Features:
- **Comprehensive Logging**: Logs method, URL, headers, body, and response details
- **Request IDs**: Unique ID for each request for tracking
- **Performance Metrics**: Response time tracking
- **Structured Output**: JSON format for easy parsing
- **Configurable**: Exclude paths, headers, and control log size

### Usage:

```typescript
import { withLogging, createLoggingMiddleware } from '@/middleware/logger';

// In API route
export async function GET(request: NextRequest) {
  return withLogging(request, async (req) => {
    // Your handler logic
    return NextResponse.json({ data: 'example' });
  });
}

// Custom configuration
const customLogger = createLoggingMiddleware({
  excludePaths: ['/api/health'],
  excludeHeaders: ['authorization', 'cookie'],
  maxBodyLogSize: 5120,
  logger: async (entry) => {
    // Send to external logging service
    await sendToLogService(entry);
  }
});
```

## 3. QDRANT Vector Database Integration (`lib/qdrant.ts`)

### Features:
- **Connection Management**: Automatic connection handling
- **CRUD Operations**: Create, read, update, delete vectors
- **Search Functions**: Vector similarity search
- **Collection Management**: Create and manage collections
- **Error Handling**: Built-in retry and error management

### Usage:

```typescript
import { qdrantDB } from '@/lib/qdrant';

// Create collection
await qdrantDB.createCollection('embeddings', 1536, 'Cosine');

// Insert vectors
await qdrantDB.upsertVectors('embeddings', [
  {
    id: 'doc1',
    vector: [0.1, 0.2, ...], // 1536-dimensional vector
    payload: { text: 'Hello world', category: 'greeting' }
  }
]);

// Search similar vectors
const results = await qdrantDB.search('embeddings', queryVector, {
  limit: 5,
  score_threshold: 0.7,
  filter: { category: 'greeting' }
});

// Update metadata
await qdrantDB.updatePayload('embeddings', 'doc1', {
  updated_at: new Date().toISOString()
});
```

## 4. Error Handling & Recovery (`lib/errorHandler.ts`)

### Features:
- **Retry Logic**: Configurable exponential backoff
- **Circuit Breaker**: Prevents cascading failures
- **Error Boundaries**: React component error handling
- **Fallback Mechanisms**: Graceful degradation
- **Error Logging**: Structured error tracking and notifications

### Usage:

```typescript
import { errorHandler } from '@/lib/errorHandler';

// With retry logic
const result = await errorHandler.withRetry(
  async () => fetchDataFromAPI(),
  {
    maxAttempts: 3,
    initialDelay: 1000,
    onRetry: (error, attempt) => console.log(`Retry ${attempt}`)
  }
);

// With circuit breaker
const data = await errorHandler.withCircuitBreaker(
  'external-api',
  async () => callExternalAPI(),
  {
    failureThreshold: 5,
    resetTimeout: 60000
  }
);

// Register fallback
errorHandler.registerFallback('external-api', () => ({
  data: 'cached data',
  cached: true
}));

// Complete error handling
const result = await errorHandler.withErrorHandling(
  async () => riskyOperation(),
  {
    name: 'risky-operation',
    retry: { maxAttempts: 2 },
    circuitBreaker: { failureThreshold: 3 },
    fallback: () => defaultValue
  }
);

// React Error Boundary
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary fallback={(error, reset) => <CustomError />}>
  <YourApp />
</ErrorBoundary>
```

## Environment Variables

Create a `.env.local` file based on `.env.example`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Authentication
JWT_SECRET=your-secret-key-here
AUTH_SERVICE_URL=http://localhost:4000

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-api-key-here
```

## Example Implementation

See `/app/api/example/route.ts` for a complete example integrating all features:
- Authentication middleware
- Request/response logging
- QDRANT operations
- Error handling with retry and circuit breaker

See `/app/protected-example/page.tsx` for a client-side example with:
- Protected route using withAuth HOC
- Error boundary integration
- Authenticated API calls

## Dependencies

The following package has been added:
- `@qdrant/js-client-rest`: For QDRANT vector database integration

All other features use built-in Next.js and React capabilities.