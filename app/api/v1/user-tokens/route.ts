/**
 * User Tokens API Route for MelodAI Service
 *
 * Handles user authentication, device registration, and language preferences
 * with comprehensive validation, error handling, and production-ready features.
 */

import User from "@/lib/models/User";
import connectToDatabase from "@/lib/mongodb";
import {
  createUserTokenSchema,
  updateUserLanguageSchema,
  validateRequest,
} from "@/lib/validations";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/v1/user-tokens
 *
 * Creates or updates user tokens for device authentication.
 * Supports both simple device registration and full Spotify profile integration.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await req.json();
    const validation = validateRequest(createUserTokenSchema)(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          details: validation.details,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Connect to database with error handling
    await connectToDatabase();

    let user;
    let isNewUser = false;

    // Try to find existing user by device ID first, then by push token
    if (validatedData.deviceId) {
      user = await User.findOne({
        "device_info.device_id": validatedData.deviceId,
      });
    }

    if (!user && validatedData.expoPushToken) {
      user = await User.findOne({
        "device_info.push_token": validatedData.expoPushToken,
      });
    }

    if (user) {
      // Update existing user
      const now = new Date().toISOString();

      // Update device info
      user.device_info.push_token = validatedData.expoPushToken;
      user.device_info.device_id = validatedData.deviceId;
      user.device_info.device_type = validatedData.deviceName;
      user.device_info.os_version = validatedData.osVersion;
      user.device_info.app_version = validatedData.appVersion;
      user.device_info.last_push_token_update = now;

      // Update app metadata
      user.app_metadata.last_login = now;
      user.app_metadata.last_activity = now;
      user.app_metadata.platform = validatedData.platform;
      user.app_metadata.language_preference =
        validatedData.currentLanguage || "en";
      user.app_metadata.app_version = validatedData.appVersion;

      // Update preferences if provided
      if (validatedData.preferences) {
        user.preferences = {
          ...user.preferences,
          ...validatedData.preferences,
          notification_preferences: {
            ...user.preferences.notification_preferences,
            ...validatedData.preferences.notification_preferences,
          },
        };
      }

      // Increment session count and save
      user.app_metadata.total_sessions += 1;
      await user.save();
    } else {
      // Create new user
      isNewUser = true;
      const now = new Date().toISOString();
      const userId = uuidv4();

      // Prepare user data
      const userData = {
        id: userId,
        spotify_profile: validatedData.spotifyProfile || {
          id: `temp_${userId}`, // Temporary ID until Spotify integration
          display_name: validatedData.deviceName,
          email: `temp_${userId}@melodai.app`,
          country: "US",
          product: "free" as const,
          followers: 0,
          images: [],
          external_urls: {
            spotify: "https://spotify.com",
          },
        },
        app_metadata: {
          created_at: now,
          last_login: now,
          last_activity: now,
          language_preference: validatedData.currentLanguage,
          timezone: "UTC",
          total_sessions: 1,
          total_api_calls: 1,
          app_version: validatedData.appVersion,
          platform: validatedData.platform,
        },
        device_info: {
          push_token: validatedData.expoPushToken,
          device_id: validatedData.deviceId,
          device_type: validatedData.deviceName,
          os_version: validatedData.osVersion,
          app_version: validatedData.appVersion,
          notifications_enabled: true,
          last_push_token_update: now,
        },
        preferences: {
          preferred_genres: validatedData.preferences?.preferred_genres || [],
          listening_habits: {},
          interaction_patterns: {},
          privacy_settings: {},
          notification_preferences: {
            new_music: true,
            playlist_updates: true,
            recommendations: true,
            system_updates: true,
            marketing: false,
            ...validatedData.preferences?.notification_preferences,
          },
        },
        subscription: {
          type: "free" as const,
          features_enabled: ["basic_discovery", "playlist_creation"],
        },
        created_at: now,
        updated_at: now,
      };

      user = await User.create(userData);
    }

    // Prepare response data (exclude sensitive information)
    const responseData = {
      id: user.id,
      spotify_profile: {
        display_name: user.spotify_profile.display_name,
        country: user.spotify_profile.country,
        product: user.spotify_profile.product,
      },
      app_metadata: {
        last_login: user.app_metadata.last_login,
        language_preference: user.app_metadata.language_preference,
        platform: user.app_metadata.platform,
        total_sessions: user.app_metadata.total_sessions,
      },
      preferences: {
        preferred_genres: user.preferences.preferred_genres,
        notification_preferences: user.preferences.notification_preferences,
      },
      subscription: user.subscription,
      is_new_user: isNewUser,
    };

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: responseData,
        meta: {
          response_time_ms: responseTime,
          is_new_user: isNewUser,
        },
        timestamp: new Date().toISOString(),
      },
      { status: isNewUser ? 201 : 200 }
    );
  } catch (error) {
    console.error("Error in user token creation:", error);

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: "User authentication failed",
        code: "AUTH_ERROR",
        meta: {
          response_time_ms: responseTime,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/user-tokens
 *
 * Updates user language preferences by push token.
 */
export async function PUT(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await req.json();
    const validation = validateRequest(updateUserLanguageSchema)(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          details: validation.details,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const { token, language } = validation.data;

    // Connect to database
    await connectToDatabase();

    // Find and update user
    const user = await User.findOneAndUpdate(
      { "device_info.push_token": token },
      {
        "app_metadata.language_preference": language,
        updated_at: new Date().toISOString(),
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
          code: "USER_NOT_FOUND",
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Update last activity
    user.app_metadata.last_activity = new Date().toISOString();
    await user.save();

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          language_preference: user.app_metadata.language_preference,
          updated_at: user.updated_at,
        },
        meta: {
          response_time_ms: responseTime,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating user language:", error);

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update language preference",
        code: "UPDATE_ERROR",
        meta: {
          response_time_ms: responseTime,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/user-tokens
 *
 * Health check endpoint for the user tokens service.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    await connectToDatabase();

    // Get basic stats
    const userCount = await User.countDocuments();
    const activeUsers = await User.countDocuments({
      "app_metadata.last_activity": {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
      },
    });

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: {
          service: "user-tokens",
          status: "healthy",
          stats: {
            total_users: userCount,
            active_users_24h: activeUsers,
          },
        },
        meta: {
          response_time_ms: responseTime,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check failed:", error);

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: "Service health check failed",
        code: "HEALTH_CHECK_ERROR",
        meta: {
          response_time_ms: responseTime,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
