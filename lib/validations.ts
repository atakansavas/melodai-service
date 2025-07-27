/**
 * Validation Schemas for MelodAI Service
 *
 * Zod schemas for validating API requests and ensuring data integrity
 * before processing user authentication and chat sessions.
 */

import { z } from "zod";

// Common validation schemas
export const uuidSchema = z.string().uuid("Invalid UUID format");
export const timestampSchema = z.string().datetime("Invalid timestamp format");
export const emailSchema = z
  .string()
  .email("Invalid email format")
  .toLowerCase();
export const countrySchema = z
  .string()
  .length(2, "Country code must be 2 characters")
  .toUpperCase();
export const urlSchema = z.string().url("Invalid URL format");

// User token validation schemas
export const createUserTokenSchema = z.object({
  // Device Information
  deviceInfo: z.object({
    pushToken: z
      .string()
      .min(0, "Push token is required")
      .max(200, "Push token is too long")
      .optional(),

    deviceId: z
      .string()
      .min(1, "Device ID is required")
      .max(100, "Device ID is too long"),

    platform: z.string().min(1, "Platform is required"),

    deviceName: z
      .string()
      .min(1, "Device name is required")
      .max(100, "Device name is too long")
      .trim(),

    osVersion: z
      .string()
      .min(1, "OS version is required")
      .max(50, "OS version is too long")
      .trim(),

    appVersion: z
      .string()
      .min(1, "App version is required")
      .max(20, "App version is too long")
      .trim(),

    currentLanguage: z
      .string()
      .min(2, "Language code must be at least 2 characters")
      .max(5, "Language code cannot exceed 5 characters")
      .default("en"),
  }),

  // Spotify Profile (for full user creation)
  spotifyProfile: z
    .object({
      id: z.string().min(1, "Spotify ID is required"),
      display_name: z.string().min(1, "Display name is required").max(100),
      email: emailSchema,
      country: countrySchema,
      product: z.enum(["premium", "free"]),
      followers: z.number().min(0).default(0),
      images: z
        .array(
          z.object({
            url: urlSchema,
            height: z.number().positive().nullable().default(null),
            width: z.number().positive().nullable().default(null),
          })
        )
        .default([]),
      external_urls: z.object({
        spotify: urlSchema,
      }),
    })
    .optional(),

  // User Preferences (optional during token creation)
  preferences: z
    .object({
      preferred_genres: z.array(z.string().trim().toLowerCase()).default([]),
      language_preference: z.string().min(2).max(5).default("en"),
      timezone: z.string().default("UTC"),
      notification_preferences: z
        .object({
          new_music: z.boolean().default(true),
          playlist_updates: z.boolean().default(true),
          recommendations: z.boolean().default(true),
          system_updates: z.boolean().default(true),
          marketing: z.boolean().default(false),
        })
        .default({}),
    })
    .default({}),
});

export const updateUserLanguageSchema = z.object({
  token: z.string().min(1, "Token is required"),
  language: z
    .string()
    .min(2, "Language code must be at least 2 characters")
    .max(5, "Language code cannot exceed 5 characters"),
});

// User registration/update schema
export const userRegistrationSchema = z.object({
  deviceInfo: z.object({
    deviceId: z.string().min(1, "Device ID is required"),
    platform: z.enum(["ios", "android", "web"]),
    deviceName: z.string().min(1, "Device name is required").max(100),
    osVersion: z.string().min(1, "OS version is required").max(50),
    appVersion: z.string().min(1, "App version is required").max(20),
    pushToken: z.string().max(200).optional(),
    notificationsEnabled: z.boolean().default(true),
  }),

  spotifyProfile: z.object({
    id: z.string().min(1, "Spotify ID is required"),
    display_name: z.string().min(1, "Display name is required").max(100),
    email: emailSchema,
    country: countrySchema,
    product: z.enum(["premium", "free"]),
    followers: z.number().min(0).default(0),
    images: z
      .array(
        z.object({
          url: urlSchema,
          height: z.number().positive().nullable().default(null),
          width: z.number().positive().nullable().default(null),
        })
      )
      .default([]),
    external_urls: z.object({
      spotify: urlSchema,
    }),
  }),

  preferences: z
    .object({
      preferred_genres: z
        .array(z.string().trim().toLowerCase())
        .max(20)
        .default([]),
      language_preference: z.string().min(2).max(5).default("en"),
      timezone: z.string().default("UTC"),
      listening_habits: z.record(z.any()).default({}),
      interaction_patterns: z.record(z.any()).default({}),
      privacy_settings: z.record(z.any()).default({}),
      notification_preferences: z
        .object({
          new_music: z.boolean().default(true),
          playlist_updates: z.boolean().default(true),
          recommendations: z.boolean().default(true),
          system_updates: z.boolean().default(true),
          marketing: z.boolean().default(false),
        })
        .default({}),
    })
    .default({}),
});

// Chat session validation schemas
export const createChatSessionSchema = z.object({
  user_id: uuidSchema,
  session_type: z
    .enum(["discovery", "playlist_creation", "general", "support"])
    .default("general"),
  chat_type: z
    .enum(["song_discovery", "playlist_creation", "general"])
    .default("general"),
  user_intent: z.string().min(1, "User intent is required").max(500),
  related_track_id: z.string().trim().optional(),
  related_playlist_id: z.string().trim().optional(),
  conversation_mood: z.string().max(100).optional(),
});

export const addChatMessageSchema = z.object({
  session_id: uuidSchema,
  role: z.enum(["user", "assistant"]),
  message: z.string().min(1, "Message content is required").max(10000),
  message_type: z.enum(["text", "action", "spotify_result"]).default("text"),
  action_taken: z.string().max(200).optional(),
  spotify_api_call: z.string().max(500).optional(),
  response_time_ms: z.number().min(0).optional(),
});

export const endChatSessionSchema = z.object({
  session_id: uuidSchema,
  user_satisfaction: z.number().min(0).max(10).optional(),
  goals_achieved: z.array(z.string().max(200)).default([]),
});

// Query parameter validation schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z
    .enum(["created_at", "updated_at", "-created_at", "-updated_at"])
    .default("-created_at"),
});

export const userQuerySchema = z
  .object({
    spotify_id: z.string().optional(),
    email: emailSchema.optional(),
    device_id: z.string().optional(),
    platform: z.enum(["ios", "android", "web"]).optional(),
    active_since: timestampSchema.optional(),
  })
  .refine((data) => Object.values(data).some((val) => val !== undefined), {
    message: "At least one query parameter is required",
  });

export const chatSessionQuerySchema = z.object({
  user_id: uuidSchema.optional(),
  session_type: z
    .enum(["discovery", "playlist_creation", "general", "support"])
    .optional(),
  chat_type: z
    .enum(["song_discovery", "playlist_creation", "general"])
    .optional(),
  active_only: z.coerce.boolean().default(false),
  from_date: timestampSchema.optional(),
  to_date: timestampSchema.optional(),
});

// Error response schema
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
  timestamp: timestampSchema.default(() => new Date().toISOString()),
});

// Success response schema
export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  meta: z
    .object({
      page: z.number().optional(),
      limit: z.number().optional(),
      total: z.number().optional(),
      total_pages: z.number().optional(),
    })
    .optional(),
  timestamp: timestampSchema.default(() => new Date().toISOString()),
});

// Health check schema
export const healthCheckSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  timestamp: timestampSchema,
  services: z.object({
    database: z.object({
      status: z.enum(["up", "down"]),
      response_time_ms: z.number().optional(),
    }),
    supabase: z
      .object({
        status: z.enum(["up", "down"]),
        response_time_ms: z.number().optional(),
      })
      .optional(),
  }),
  version: z.string(),
});

// Chat API request/response schemas
export const chatRequestSchema = z.object({
  message: z
    .string()
    .min(1, "Message is required")
    .max(10000, "Message too long"),
  sessionId: z.string().uuid().optional(),
  context: z.record(z.any()).optional(), // Dynamic key-value pairs
});

export const chatResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    reply: z.string(),
    sessionId: z.string().uuid(),
    responseTime: z.number(),
    contextUsed: z.array(z.string()).optional(),
    tokensUsed: z.number().optional(),
  }),
  timestamp: timestampSchema.default(() => new Date().toISOString()),
});

// Export type inference helpers
export type CreateUserTokenInput = z.infer<typeof createUserTokenSchema>;
export type UpdateUserLanguageInput = z.infer<typeof updateUserLanguageSchema>;
export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>;
export type CreateChatSessionInput = z.infer<typeof createChatSessionSchema>;
export type AddChatMessageInput = z.infer<typeof addChatMessageSchema>;
export type EndChatSessionInput = z.infer<typeof endChatSessionSchema>;
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
export type ChatResponseOutput = z.infer<typeof chatResponseSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;
export type ChatSessionQuery = z.infer<typeof chatSessionQuerySchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type SuccessResponse = z.infer<typeof successResponseSchema>;
export type HealthCheck = z.infer<typeof healthCheckSchema>;

// Validation middleware helper
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return (
    data: unknown
  ):
    | { success: true; data: T }
    | { success: false; error: string; details?: any } => {
    try {
      const validatedData = schema.parse(data);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.reduce((acc, err) => {
          const path = err.path.join(".");
          acc[path] = err.message;
          return acc;
        }, {} as Record<string, string>);

        return {
          success: false,
          error: "Validation failed",
          details,
        };
      }

      return {
        success: false,
        error: "Unknown validation error",
      };
    }
  };
}
