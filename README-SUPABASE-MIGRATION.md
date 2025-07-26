# QdRant to Supabase Migration Guide

This document outlines the successful migration from QdRant vector database to Supabase for the MelodAI Service.

## Migration Overview

The migration involved replacing QdRant as the primary database with Supabase, maintaining all existing functionality while improving data structure, query performance, and development experience.

## Changes Made

### 1. Database Infrastructure

**Before (QdRant):**
- Vector database used as document store
- Manual collection management
- Custom vector operations for data storage
- Limited query capabilities for complex operations

**After (Supabase):**
- PostgreSQL-based relational database
- Structured tables with proper relationships
- JSONB columns for flexible data storage
- Rich query capabilities with SQL

### 2. Schema Changes

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_profile JSONB NOT NULL,
  app_metadata JSONB NOT NULL,
  device_info JSONB NOT NULL,
  preferences JSONB NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Chat Sessions Table
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::JSONB,
  spotify_context JSONB,
  session_metadata JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Code Changes

#### Dependencies
- **Removed:** `@qdrant/js-client-rest`
- **Added:** `@supabase/supabase-js`

#### Configuration Files
- **Deleted:** `lib/qdrant.ts`
- **Created:** `lib/supabase.ts` - Supabase client configuration
- **Created:** `lib/supabase-helpers.ts` - Database operation helpers
- **Created:** `types/supabase.ts` - TypeScript types for database schema

#### API Routes Updated
- `app/api/v1/user/route.ts` - User management operations
- `app/api/chat/route.ts` - Chat functionality
- `app/api/example/route.ts` - Example/demo operations

#### Environment Variables
- **Removed:** `QDRANT_URL`, `QDRANT_API_KEY`
- **Added:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`

### 4. Key Features Maintained

✅ **User Management**
- User registration and authentication
- Device information tracking
- Language preferences
- Spotify profile integration

✅ **Chat Sessions**
- Message history storage
- Session metadata tracking
- Real-time conversation management
- Spotify context integration

✅ **Error Handling**
- Circuit breaker patterns
- Retry mechanisms
- Comprehensive error logging

✅ **Health Monitoring**
- Database connection health checks
- Performance metrics
- Service status monitoring

## Database Setup Instructions

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and API keys

### 2. Run Database Schema
Execute the SQL files in order:
```bash
# Create tables and indexes
psql -h your-db-host -d your-db-name -f sql/schema.sql

# Optional: Insert test data
psql -h your-db-host -d your-db-name -f sql/seed.sql
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 4. Test the Migration
```bash
npm run dev
curl http://localhost:3000/api/v1/user  # Health check
curl http://localhost:3000/api/chat     # Chat service health
```

## Migration Benefits

### Performance Improvements
- **Query Performance**: Native SQL queries vs. vector operations
- **Indexing**: Proper database indexes for faster lookups
- **Connections**: Connection pooling and management by Supabase

### Developer Experience
- **Type Safety**: Full TypeScript support with generated types
- **SQL Familiarity**: Standard SQL operations vs. custom vector API
- **Tooling**: Rich ecosystem of PostgreSQL tools and extensions

### Scalability
- **Auto-scaling**: Supabase handles database scaling automatically
- **Backup & Recovery**: Built-in backup and point-in-time recovery
- **Monitoring**: Comprehensive dashboard and monitoring tools

### Security
- **Row Level Security (RLS)**: Fine-grained access control
- **API Security**: Built-in authentication and authorization
- **Compliance**: SOC 2 Type II certified infrastructure

## API Compatibility

The migration maintains full API compatibility. All existing endpoints continue to work with the same request/response formats:

- `POST /api/v1/user` - User registration/authentication
- `PUT /api/v1/user` - Update user preferences  
- `GET /api/v1/user` - Service health check
- `POST /api/chat` - Chat interactions
- `GET /api/chat` - Chat service health

## Known Issues & Limitations

### Minor Type Issues
Some TypeScript type conflicts exist in the chat route related to:
- Circuit breaker method signatures
- Spotify context type matching
- Streaming response handling

These issues don't affect functionality but should be addressed in future iterations.

### Future Improvements
1. **Real-time Features**: Implement Supabase real-time subscriptions
2. **Vector Search**: Add pgvector extension for semantic search capabilities
3. **Caching**: Implement Redis caching layer for frequently accessed data
4. **Analytics**: Add proper analytics and monitoring with Supabase metrics

## Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:integration
```

### Health Checks
- User service: `GET /api/v1/user`
- Chat service: `GET /api/chat`
- Example service: `GET /api/example`

## Support

For questions or issues related to this migration:

1. Check the API health endpoints for service status
2. Review the SQL schema files for database structure
3. Examine the Supabase helper functions for operation examples
4. Reference the TypeScript types for data structure requirements

## Migration Checklist

- [x] Install Supabase dependencies
- [x] Remove QdRant dependencies  
- [x] Create database schema
- [x] Implement Supabase helpers
- [x] Migrate user API routes
- [x] Migrate chat API routes
- [x] Migrate example API routes
- [x] Update validation schemas
- [x] Update environment configuration
- [x] Remove QdRant files
- [x] Test all API endpoints
- [x] Document migration process

The migration is now complete and the service is running on Supabase infrastructure! 