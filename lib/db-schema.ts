/**
 * Database Schema Definitions for MelodAI Service
 *
 * This file contains all database object interfaces for users and chat sessions.
 */

/**
 * Chat Session Database Object
 *
 * Stores AI conversation history and outcomes for music discovery.
 *
 * Vector: conversation_vector (768D) - Represents conversation context and intent
 */
export interface ChatSessionDBObject {
  /** Unique chat session identifier (UUID) */
  id: string;
  /** User ID reference */
  user_id: string;

  /** Session metadata */
  session_metadata: {
    /** Session creation timestamp */
    created_at: string;
    /** Session end timestamp */
    ended_at?: string;
    /** Session duration in minutes */
    duration_minutes?: number;
    /** Total message count */
    message_count: number;
    /** Type of chat session */
    session_type: "discovery" | "playlist_creation" | "general" | "support";
  };

  /** Conversation context */
  context: {
    /** Related track ID */
    related_track_id?: string;
    /** Related playlist ID */
    related_playlist_id?: string;
    /** Chat type classification */
    chat_type: "song_discovery" | "playlist_creation" | "general";
    /** User's intent */
    user_intent: string;
    /** Conversation mood */
    conversation_mood?: string;
    /** User satisfaction score */
    user_satisfaction_score?: number;
  };

  /** Chat message history */
  chat_history: Array<{
    /** Message ID */
    id: string;
    /** Message timestamp */
    timestamp: string;
    /** Message role */
    role: "user" | "assistant";
    /** Message content */
    message: string;
    /** Message type */
    message_type: "text" | "action" | "spotify_result";
    /** Action taken */
    action_taken?: string;
    /** Spotify API call made */
    spotify_api_call?: string;
    /** Response time in milliseconds */
    response_time_ms?: number;
  }>;

  /** Session outcomes */
  outcomes: {
    /** Tracks discovered */
    tracks_discovered: string[];
    /** Playlists created */
    playlists_created: string[];
    /** Tracks liked */
    tracks_liked: string[];
    /** User satisfaction rating */
    user_satisfaction?: number;
    /** Goals achieved */
    goals_achieved: string[];
  };

  /** Timestamps */
  created_at: string;
  updated_at: string;
}

/**
 * User Database Object
 *
 * Stores comprehensive user information including Spotify profile data,
 * application metadata, device information, and user preferences.
 *
 * Vector: preference_vector (512D) - Represents user's music taste and behavior
 * patterns
 */
export interface UserDBObject {
  /** Unique user identifier (UUID) */
  id: string;

  /** Spotify profile information */
  spotify_profile: {
    /** Spotify user ID */
    id: string;
    /** Display name on Spotify */
    display_name: string;
    /** User's email address */
    email: string;
    /** User's country code (ISO 3166-1 alpha-2) */
    country: string;
    /** Spotify subscription type */
    product: "premium" | "free";
    /** Number of followers */
    followers: number;
    /** Profile images */
    images: Array<{
      url: string;
      height: number | null;
      width: number | null;
    }>;
    /** External URLs */
    external_urls: {
      spotify: string;
    };
  };

  /** Application-specific metadata */
  app_metadata: {
    /** Account creation timestamp */
    created_at: string;
    /** Last login timestamp */
    last_login: string;
    /** Last activity timestamp */
    last_activity: string;
    /** User's preferred language */
    language_preference: string;
    /** User's timezone */
    timezone: string;
    /** Total number of sessions */
    total_sessions: number;
    /** Total API calls made */
    total_api_calls: number;
    /** App version when user was created */
    app_version: string;
    /** Platform used */
    platform: "ios" | "android" | "web";
  };

  /** Device information */
  device_info: {
    /** Push notification token */
    push_token?: string;
    /** Unique device identifier */
    device_id: string;
    /** Device type */
    device_type: string;
    /** Operating system version */
    os_version: string;
    /** App version */
    app_version: string;
    /** Notifications enabled flag */
    notifications_enabled: boolean;
    /** Last push token update */
    last_push_token_update?: string;
  };

  /** User preferences and settings */
  preferences: {
    /** Preferred music genres */
    preferred_genres: string[];
    /** Listening habits data */
    listening_habits: Record<string, any>;
    /** User interaction patterns */
    interaction_patterns: Record<string, any>;
    /** Privacy settings */
    privacy_settings: Record<string, any>;
    /** Notification preferences */
    notification_preferences: {
      new_music: boolean;
      playlist_updates: boolean;
      recommendations: boolean;
      system_updates: boolean;
      marketing: boolean;
    };
  };

  /** Subscription information */
  subscription: {
    /** Subscription type */
    type: "free" | "premium";
    /** Subscription expiration date */
    expires_at?: string;
    /** Enabled features */
    features_enabled: string[];
  };

  /** Timestamps */
  created_at: string;
  updated_at: string;
}
