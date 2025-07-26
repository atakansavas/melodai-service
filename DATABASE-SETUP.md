# MelodAI Database Setup & Authentication Guide

## Overview

This document provides setup instructions for the MelodAI service's database layer and user authentication system that has been completely refactored for production use.

## New Architecture

### 🗄️ Database Schema
- **UserDBObject**: Comprehensive user profiles with Spotify integration
- **ChatSessionDBObject**: Detailed conversation tracking and analytics
- Full MongoDB integration with Mongoose ODM
- Production-ready validation and error handling

### 🔧 Technologies Added
- **MongoDB** with Mongoose ODM for data persistence
- **Zod** for runtime type validation and API security
- **UUID** for unique identifier generation
- **Validator** for data sanitization and validation

## Quick Start

### 1. Environment Setup

Create a `.env.local` file in your project root:

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/melodai

# Qdrant Vector Database (existing)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key

# Application Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

### 2. MongoDB Setup Options

#### Option A: Local MongoDB
```bash
# Install MongoDB locally
brew install mongodb/brew/mongodb-community
brew services start mongodb/brew/mongodb-community
```

#### Option B: MongoDB Atlas (Recommended for Production)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/melodai`
4. Update `MONGODB_URI` in your `.env.local`

### 3. Install Dependencies

Dependencies are already added to `package.json`. Run:

```bash
npm install
```

### 4. Start Development Server

```bash
npm run dev
```

## API Endpoints

### User Authentication

#### `POST /api/v1/user-tokens`
Creates or updates user authentication tokens.

**Request Body:**
```json
{
  "deviceId": "unique-device-id",
  "platform": "ios", // "ios" | "android" | "web"
  "deviceName": "iPhone 15 Pro",
  "osVersion": "17.0",
  "appVersion": "1.0.0",
  "currentLanguage": "en",
  "expoPushToken": "optional-push-token",
  "spotifyProfile": { // Optional for full Spotify integration
    "id": "spotify-user-id",
    "display_name": "John Doe",
    "email": "john@example.com",
    "country": "US",
    "product": "premium",
    "followers": 100,
    "images": [],
    "external_urls": {
      "spotify": "https://open.spotify.com/user/userid"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "spotify_profile": {
      "display_name": "John Doe",
      "country": "US",
      "product": "premium"
    },
    "app_metadata": {
      "last_login": "2024-01-15T10:30:00.000Z",
      "language_preference": "en",
      "platform": "ios",
      "total_sessions": 1
    },
    "preferences": {
      "preferred_genres": [],
      "notification_preferences": {
        "new_music": true,
        "playlist_updates": true,
        "recommendations": true,
        "system_updates": true,
        "marketing": false
      }
    },
    "subscription": {
      "type": "free",
      "features_enabled": ["basic_discovery", "playlist_creation"]
    },
    "is_new_user": true
  },
  "meta": {
    "response_time_ms": 156,
    "is_new_user": true
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### `PUT /api/v1/user-tokens`
Updates user language preferences.

**Request Body:**
```json
{
  "token": "expo-push-token",
  "language": "es"
}
```

#### `GET /api/v1/user-tokens`
Health check endpoint with service statistics.

## Database Models

### User Model (`lib/models/User.ts`)

**Key Features:**
- Full Spotify profile integration
- Device tracking and management
- User preferences and settings
- Session and API usage analytics
- Notification preferences
- Subscription management

**Static Methods:**
```typescript
User.findBySpotifyId(spotifyId: string)
User.findByEmail(email: string)
User.findByDeviceId(deviceId: string)
User.findByPushToken(pushToken: string)
```

**Instance Methods:**
```typescript
user.updateLastActivity()
user.incrementSessionCount()
user.incrementApiCalls()
```

### Chat Session Model (`lib/models/ChatSession.ts`)

**Key Features:**
- Complete conversation tracking
- Session analytics and outcomes
- Music discovery tracking
- User satisfaction measurement
- Performance metrics

**Static Methods:**
```typescript
ChatSession.findByUserId(userId: string, limit?: number)
ChatSession.findActiveSessionsByUserId(userId: string)
ChatSession.findBySessionType(sessionType: string)
ChatSession.getSessionStats(userId?: string)
```

**Instance Methods:**
```typescript
session.addMessage(message: MessageData)
session.endSession(satisfaction?: number)
session.addDiscoveredTrack(trackId: string)
session.addCreatedPlaylist(playlistId: string)
session.addLikedTrack(trackId: string)
```

## Validation System

### Request Validation (`lib/validations.ts`)

All API endpoints use Zod schemas for comprehensive validation:

- **Type Safety**: Runtime type checking with TypeScript inference
- **Data Sanitization**: Automatic trimming, case conversion, and formatting
- **Error Handling**: Detailed validation error messages
- **Security**: Input validation to prevent injection attacks

**Example Usage:**
```typescript
import { validateRequest, createUserTokenSchema } from '@/lib/validations';

const validation = validateRequest(createUserTokenSchema)(requestBody);
if (!validation.success) {
  // Handle validation errors
  return NextResponse.json({
    success: false,
    error: validation.error,
    details: validation.details
  }, { status: 400 });
}
```

## Database Connection

### MongoDB Connection (`lib/mongodb.ts`)

**Features:**
- Singleton connection pattern
- Connection pooling
- Automatic reconnection
- Health checking
- Graceful shutdown
- Production-ready configuration

**Usage:**
```typescript
import connectToDatabase from '@/lib/mongodb';

await connectToDatabase();
// Database is now connected and ready to use
```

## Production Considerations

### Security
- ✅ Input validation with Zod schemas
- ✅ Data sanitization and trimming
- ✅ Error message standardization
- ✅ Request/response logging capabilities

### Performance
- ✅ Database connection pooling
- ✅ Optimized indexes on frequently queried fields
- ✅ Response time tracking
- ✅ Efficient data models with minimal nesting

### Monitoring
- ✅ Health check endpoints
- ✅ User activity tracking
- ✅ API usage analytics
- ✅ Error logging and reporting

### Scalability
- ✅ Horizontal scaling ready with MongoDB
- ✅ Stateless API design
- ✅ Efficient query patterns
- ✅ Proper database indexing

## Migration from Old System

If you had previous user data, you'll need to:

1. **Backup existing data**
2. **Run migration scripts** (create as needed)
3. **Update client applications** to use new API format
4. **Test thoroughly** with new validation rules

## Troubleshooting

### Common Issues

**Connection Errors:**
```
Error: MongoDB connection failed
```
- Check `MONGODB_URI` in environment variables
- Ensure MongoDB is running (local) or accessible (Atlas)
- Verify network connectivity and firewall settings

**Validation Errors:**
```
Validation failed: deviceId is required
```
- Check request body format against API documentation
- Ensure all required fields are provided
- Verify data types match expected schemas

**Model Errors:**
```
Cannot find module '@/lib/models/User'
```
- Ensure all dependencies are installed: `npm install`
- Check TypeScript compilation: `npm run build`
- Verify file paths and imports

## Support

For issues or questions:
1. Check this documentation
2. Review the validation schemas in `lib/validations.ts`
3. Check database models in `lib/models/`
4. Review API routes in `app/api/v1/user-tokens/`

The system is now production-ready with comprehensive error handling, validation, and monitoring capabilities. 