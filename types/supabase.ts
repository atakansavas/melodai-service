export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          spotify_profile: {
            id: string;
            display_name: string;
            email: string;
            country: string;
            product: "premium" | "free";
            followers: number;
            images: Array<{
              url: string;
              height?: number | null;
              width?: number | null;
            }>;
            external_urls: {
              spotify: string;
            };
          };
          app_metadata: {
            created_at: string;
            last_login: string;
            last_activity: string;
            language_preference: string;
            timezone: string;
            total_sessions: number;
            total_api_calls: number;
            app_version: string;
            platform: string;
          };
          device_info: {
            push_token?: string;
            device_id: string;
            device_type: string;
            os_version: string;
            app_version: string;
            notifications_enabled: boolean;
            last_push_token_update?: string;
          };
          preferences: {
            preferred_genres: string[];
            listening_habits: Record<string, unknown>;
            interaction_patterns: Record<string, unknown>;
            privacy_settings: Record<string, unknown>;
            notification_preferences: {
              new_music: boolean;
              playlist_updates: boolean;
              recommendations: boolean;
              system_updates: boolean;
              marketing: boolean;
            };
          };
          subscription: {
            type: "free" | "premium";
            expires_at?: string;
            features_enabled: string[];
          };
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          spotify_profile: {
            id: string;
            display_name: string;
            email: string;
            country: string;
            product: "premium" | "free";
            followers: number;
            images: Array<{
              url: string;
              height?: number | null;
              width?: number | null;
            }>;
            external_urls: {
              spotify: string;
            };
          };
          app_metadata: {
            created_at: string;
            last_login: string;
            last_activity: string;
            language_preference: string;
            timezone: string;
            total_sessions: number;
            total_api_calls: number;
            app_version: string;
            platform: string;
          };
          device_info: {
            push_token?: string;
            device_id: string;
            device_type: string;
            os_version: string;
            app_version: string;
            notifications_enabled: boolean;
            last_push_token_update?: string;
          };
          preferences: {
            preferred_genres: string[];
            listening_habits: Record<string, unknown>;
            interaction_patterns: Record<string, unknown>;
            privacy_settings: Record<string, unknown>;
            notification_preferences: {
              new_music: boolean;
              playlist_updates: boolean;
              recommendations: boolean;
              system_updates: boolean;
              marketing: boolean;
            };
          };
          subscription: {
            type: "free" | "premium";
            expires_at?: string;
            features_enabled: string[];
          };
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          spotify_profile?: {
            id: string;
            display_name: string;
            email: string;
            country: string;
            product: "premium" | "free";
            followers: number;
            images: Array<{
              url: string;
              height?: number | null;
              width?: number | null;
            }>;
            external_urls: {
              spotify: string;
            };
          };
          app_metadata?: {
            created_at: string;
            last_login: string;
            last_activity: string;
            language_preference: string;
            timezone: string;
            total_sessions: number;
            total_api_calls: number;
            app_version: string;
            platform: string;
          };
          device_info?: {
            push_token?: string;
            device_id: string;
            device_type: string;
            os_version: string;
            app_version: string;
            notifications_enabled: boolean;
            last_push_token_update?: string;
          };
          preferences?: {
            preferred_genres: string[];
            listening_habits: Record<string, unknown>;
            interaction_patterns: Record<string, unknown>;
            privacy_settings: Record<string, unknown>;
            notification_preferences: {
              new_music: boolean;
              playlist_updates: boolean;
              recommendations: boolean;
              system_updates: boolean;
              marketing: boolean;
            };
          };
          subscription?: {
            type: "free" | "premium";
            expires_at?: string;
            features_enabled: string[];
          };
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          messages: Array<{
            role: string;
            content: string;
            timestamp: string;
            metadata?: Record<string, unknown>;
          }>;
          spotify_context?: {
            access_token?: string;
            token_expires_at?: string;
            user_country?: string;
            user_product?: string;
            current_track?: Record<string, unknown>;
            playlists?: Array<Record<string, unknown>>;
            devices?: Array<Record<string, unknown>>;
          };
          session_metadata: {
            total_messages: number;
            first_message_at: string;
            last_message_at: string;
            session_duration_ms: number;
            interaction_type: string;
            source: string;
          };
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          messages?: Array<{
            role: string;
            content: string;
            timestamp: string;
            metadata?: Record<string, unknown>;
          }>;
          spotify_context?: {
            access_token?: string;
            token_expires_at?: string;
            user_country?: string;
            user_product?: string;
            current_track?: Record<string, unknown>;
            playlists?: Array<Record<string, unknown>>;
            devices?: Array<Record<string, unknown>>;
          };
          session_metadata?: {
            total_messages: number;
            first_message_at: string;
            last_message_at: string;
            session_duration_ms: number;
            interaction_type: string;
            source: string;
          };
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          messages?: Array<{
            role: string;
            content: string;
            timestamp: string;
            metadata?: Record<string, unknown>;
          }>;
          spotify_context?: {
            access_token?: string;
            token_expires_at?: string;
            user_country?: string;
            user_product?: string;
            current_track?: Record<string, unknown>;
            playlists?: Array<Record<string, unknown>>;
            devices?: Array<Record<string, unknown>>;
          };
          session_metadata?: {
            total_messages: number;
            first_message_at: string;
            last_message_at: string;
            session_duration_ms: number;
            interaction_type: string;
            source: string;
          };
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier usage
export type UserData = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

export type ChatSessionData =
  Database["public"]["Tables"]["chat_sessions"]["Row"];
export type ChatSessionInsert =
  Database["public"]["Tables"]["chat_sessions"]["Insert"];
export type ChatSessionUpdate =
  Database["public"]["Tables"]["chat_sessions"]["Update"];

export type MessageData = {
  role: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type SpotifyContext = {
  access_token?: string;
  token_expires_at?: string;
  user_country?: string;
  user_product?: string;
  current_track?: Record<string, unknown>;
  playlists?: Array<Record<string, unknown>>;
  devices?: Array<Record<string, unknown>>;
};
