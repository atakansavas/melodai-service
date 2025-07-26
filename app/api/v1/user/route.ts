/**
 * User API Route for MelodAI Service
 *
 * Handles user authentication, device registration, and language preferences
 * using Supabase database with comprehensive validation, error handling,
 * and production-ready features.
 */

import { ensureSupabaseConnection } from "@/lib/supabase";
import { supabaseHelper } from "@/lib/supabase-helpers";
import {
  createUserTokenSchema,
  updateUserLanguageSchema,
  validateRequest,
} from "@/lib/validations";
import { UserData, UserInsert } from "@/types/supabase";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

/**
 * Find user by device ID
 */
async function findUserByDeviceId(deviceId: string): Promise<UserData | null> {
  try {
    return await supabaseHelper.getUserByDeviceId(deviceId);
  } catch (error) {
    console.error("Error finding user by device ID:", error);
    return null;
  }
}

/**
 * Find user by push token
 */
async function findUserByPushToken(
  pushToken: string
): Promise<UserData | null> {
  try {
    return await supabaseHelper.getUserByPushToken(pushToken);
  } catch (error) {
    console.error("Error finding user by push token:", error);
    return null;
  }
}

/**
 * Find user by Spotify profile ID
 */
async function findUserBySpotifyId(
  spotifyId: string
): Promise<UserData | null> {
  try {
    return await supabaseHelper.getUserBySpotifyId(spotifyId);
  } catch (error) {
    console.error("Error finding user by Spotify ID:", error);
    return null;
  }
}

/**
 * Create or update user in Supabase
 */
async function upsertUser(userData: UserData): Promise<void> {
  try {
    await supabaseHelper.upsertUser(userData);
  } catch (error) {
    console.error("Error upserting user:", error);
    throw new Error("Failed to save user data");
  }
}

/**
 * POST /api/v1/user
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

    // Ensure Supabase connection
    await ensureSupabaseConnection();

    let user: UserData | null = null;
    let isNewUser = false;

    // Try to find existing user by Spotify ID first, then by push token
    if (validatedData.spotifyProfile?.id) {
      user = await findUserBySpotifyId(validatedData.spotifyProfile.id);
    }

    if (user) {
      // Update existing user
      const now = new Date().toISOString();

      // Update device info
      user.device_info.push_token = validatedData.deviceInfo.pushToken;
      user.device_info.device_id = validatedData.deviceInfo.deviceId;
      user.device_info.device_type = validatedData.deviceInfo.deviceName;
      user.device_info.os_version = validatedData.deviceInfo.osVersion;
      user.device_info.app_version = validatedData.deviceInfo.appVersion;
      user.device_info.last_push_token_update = now;

      // Update app metadata
      user.app_metadata.last_login = now;
      user.app_metadata.last_activity = now;
      user.app_metadata.platform = validatedData.deviceInfo.platform;
      user.app_metadata.language_preference =
        validatedData.deviceInfo.currentLanguage || "en";
      user.app_metadata.app_version = validatedData.deviceInfo.appVersion;

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
      user.updated_at = now;

      await upsertUser(user);
    } else {
      // Create new user
      isNewUser = true;
      const now = new Date().toISOString();
      const userId = uuidv4();

      // Prepare user data
      const userData: UserInsert = {
        id: userId,
        spotify_profile: validatedData.spotifyProfile
          ? {
              id: validatedData.spotifyProfile.id,
              display_name: validatedData.spotifyProfile.display_name,
              email: validatedData.spotifyProfile.email,
              country: validatedData.spotifyProfile.country,
              product: validatedData.spotifyProfile.product,
              followers: validatedData.spotifyProfile.followers || 0,
              images: validatedData.spotifyProfile.images || [],
              external_urls: validatedData.spotifyProfile.external_urls,
            }
          : {
              id: `temp_${userId}`, // Temporary ID until Spotify integration
              display_name: validatedData.deviceInfo.deviceName,
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
          language_preference: validatedData.deviceInfo.currentLanguage || "en",
          timezone: "UTC",
          total_sessions: 1,
          total_api_calls: 1,
          app_version: validatedData.deviceInfo.appVersion,
          platform: validatedData.deviceInfo.platform,
        },
        device_info: {
          push_token: validatedData.deviceInfo.pushToken,
          device_id: validatedData.deviceInfo.deviceId,
          device_type: validatedData.deviceInfo.deviceName,
          os_version: validatedData.deviceInfo.osVersion,
          app_version: validatedData.deviceInfo.appVersion,
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

      user = (await supabaseHelper.createUser(userData)) as UserData;
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
 * PUT /api/v1/user
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

    // Ensure Supabase connection
    await ensureSupabaseConnection();

    // Find user by push token
    const user = await findUserByPushToken(token);

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

    // Update user language preference
    const now = new Date().toISOString();
    user.app_metadata.language_preference = language;
    user.app_metadata.last_activity = now;
    user.updated_at = now;

    await upsertUser(user);

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
 * GET /api/v1/user
 *
 * Health check endpoint for the user service.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    await ensureSupabaseConnection();

    // Get service health and stats
    const health = await supabaseHelper.healthCheck();

    // Count active users (last 24 hours)
    const activeUsers = await supabaseHelper.getActiveUsers(24);

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: {
          service: "user",
          status: health.healthy ? "healthy" : "unhealthy",
          stats: {
            total_users: health.stats.total_users,
            active_users_24h: activeUsers.length,
          },
        },
        meta: {
          response_time_ms: responseTime,
        },
        timestamp: new Date().toISOString(),
      },
      { status: health.healthy ? 200 : 503 }
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
