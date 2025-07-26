import {
  ChatSessionData,
  ChatSessionInsert,
  ChatSessionUpdate,
  MessageData,
  SpotifyContext,
  UserData,
  UserInsert,
  UserUpdate,
} from "@/types/supabase";
import { supabaseService } from "./supabase";

export interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
}

export interface FilterOptions {
  [key: string]: unknown;
}

export class SupabaseHelper {
  private client = supabaseService; // Use service client for admin operations

  // Error handling helper
  private handleError(error: any): DatabaseError {
    return {
      message: error.message || "Database operation failed",
      code: error.code,
      details: error.details,
      hint: error.hint,
    };
  }

  // Generic CRUD operations
  async insert<T>(table: string, data: T): Promise<T> {
    const { data: result, error } = await this.client
      .from(table)
      .insert(data as any)
      .select()
      .single();

    if (error) {
      throw this.handleError(error);
    }

    return result as T;
  }

  async select<T>(
    table: string,
    filters?: FilterOptions,
    options: SearchOptions = {}
  ): Promise<T[]> {
    let query = this.client.from(table).select("*");

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
          ) {
            query = query.eq(key, value);
          } else if (Array.isArray(value)) {
            query = query.in(key, value);
          }
        }
      });
    }

    // Apply options
    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 100) - 1
      );
    }

    if (options.orderBy) {
      query = query.order(options.orderBy, {
        ascending: options.ascending ?? true,
      });
    }

    const { data, error } = await query;

    if (error) {
      throw this.handleError(error);
    }

    return data as T[];
  }

  async selectOne<T>(table: string, filters: FilterOptions): Promise<T | null> {
    const results = await this.select<T>(table, filters, { limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
    const { data: result, error } = await this.client
      .from(table)
      .update(data as any)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw this.handleError(error);
    }

    return result as T;
  }

  async upsert<T>(table: string, data: T): Promise<T> {
    const { data: result, error } = await this.client
      .from(table)
      .upsert(data as any)
      .select()
      .single();

    if (error) {
      throw this.handleError(error);
    }

    return result as T;
  }

  async delete(table: string, id: string): Promise<void> {
    const { error } = await this.client.from(table).delete().eq("id", id);

    if (error) {
      throw this.handleError(error);
    }
  }

  async count(table: string, filters?: FilterOptions): Promise<number> {
    let query = this.client
      .from(table)
      .select("*", { count: "exact", head: true });

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
          ) {
            query = query.eq(key, value);
          }
        }
      });
    }

    const { count, error } = await query;

    if (error) {
      throw this.handleError(error);
    }

    return count || 0;
  }

  // User-specific operations
  async createUser(userData: UserInsert): Promise<UserData> {
    return this.insert<UserData>("users", userData as any);
  }

  async getUserById(id: string): Promise<UserData | null> {
    return this.selectOne<UserData>("users", { id });
  }

  async getUserBySpotifyId(spotifyId: string): Promise<UserData | null> {
    const { data, error } = await this.client
      .from("users")
      .select("*")
      .eq("spotify_profile->>id", spotifyId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found
      throw this.handleError(error);
    }

    return (data as UserData) || null;
  }

  async getUserByPushToken(pushToken: string): Promise<UserData | null> {
    const { data, error } = await this.client
      .from("users")
      .select("*")
      .eq("device_info->>push_token", pushToken)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found
      throw this.handleError(error);
    }

    return (data as UserData) || null;
  }

  async getUserByDeviceId(deviceId: string): Promise<UserData | null> {
    const { data, error } = await this.client
      .from("users")
      .select("*")
      .eq("device_info->>device_id", deviceId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found
      throw this.handleError(error);
    }

    return (data as UserData) || null;
  }

  async updateUser(id: string, userData: UserUpdate): Promise<UserData> {
    return this.update<UserData>("users", id, userData);
  }

  async upsertUser(userData: UserInsert & { id?: string }): Promise<UserData> {
    return this.upsert<UserData>("users", userData as any);
  }

  async getActiveUsers(hours: number = 24): Promise<UserData[]> {
    const cutoffTime = new Date(
      Date.now() - hours * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await this.client
      .from("users")
      .select("*")
      .gte("app_metadata->>last_activity", cutoffTime);

    if (error) {
      throw this.handleError(error);
    }

    return data as UserData[];
  }

  // Chat session operations
  async createChatSession(
    userId: string,
    initialMessage?: MessageData
  ): Promise<ChatSessionData> {
    const now = new Date().toISOString();
    const sessionData: ChatSessionInsert = {
      user_id: userId,
      messages: initialMessage ? [initialMessage] : [],
      session_metadata: {
        total_messages: initialMessage ? 1 : 0,
        first_message_at: now,
        last_message_at: now,
        session_duration_ms: 0,
        interaction_type: "chat",
        source: "api",
      },
      created_at: now,
      updated_at: now,
    };

    return this.insert<ChatSessionData>("chat_sessions", sessionData as any);
  }

  async getChatSession(sessionId: string): Promise<ChatSessionData | null> {
    return this.selectOne<ChatSessionData>("chat_sessions", { id: sessionId });
  }

  async updateChatSession(
    sessionId: string,
    updates: ChatSessionUpdate
  ): Promise<ChatSessionData> {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return this.update<ChatSessionData>("chat_sessions", sessionId, updateData);
  }

  async addMessageToSession(
    sessionId: string,
    message: MessageData
  ): Promise<ChatSessionData> {
    const session = await this.getChatSession(sessionId);
    if (!session) {
      throw new Error("Chat session not found");
    }

    const now = new Date().toISOString();
    const updatedMessages = [...session.messages, message];
    const sessionStart = new Date(session.session_metadata.first_message_at);
    const sessionDuration = Date.now() - sessionStart.getTime();

    return this.updateChatSession(sessionId, {
      messages: updatedMessages,
      session_metadata: {
        ...session.session_metadata,
        total_messages: updatedMessages.length,
        last_message_at: now,
        session_duration_ms: sessionDuration,
      },
    });
  }

  async getUserChatSessions(
    userId: string,
    options: SearchOptions = {}
  ): Promise<ChatSessionData[]> {
    return this.select<ChatSessionData>(
      "chat_sessions",
      { user_id: userId },
      {
        limit: options.limit || 20,
        orderBy: "updated_at",
        ascending: false,
        ...options,
      }
    );
  }

  async deleteChatSession(sessionId: string): Promise<void> {
    return this.delete("chat_sessions", sessionId);
  }

  async updateSessionSpotifyContext(
    sessionId: string,
    spotifyContext: SpotifyContext
  ): Promise<ChatSessionData> {
    return this.updateChatSession(sessionId, {
      spotify_context: spotifyContext,
    });
  }

  // Real-time subscriptions
  async subscribeToUserChanges(
    userId: string,
    callback: (payload: any) => void
  ) {
    return this.client
      .channel(`user_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: `id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  }

  async subscribeToChatSessionChanges(
    sessionId: string,
    callback: (payload: any) => void
  ) {
    return this.client
      .channel(`chat_session_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_sessions",
          filter: `id=eq.${sessionId}`,
        },
        callback
      )
      .subscribe();
  }

  // Health check
  async healthCheck(): Promise<{
    healthy: boolean;
    stats: { total_users: number; total_sessions: number };
  }> {
    try {
      const [totalUsers, totalSessions] = await Promise.all([
        this.count("users"),
        this.count("chat_sessions"),
      ]);

      return {
        healthy: true,
        stats: {
          total_users: totalUsers,
          total_sessions: totalSessions,
        },
      };
    } catch (error) {
      console.error("Supabase health check failed:", error);
      return {
        healthy: false,
        stats: {
          total_users: 0,
          total_sessions: 0,
        },
      };
    }
  }
}

// Export default instance
export const supabaseHelper = new SupabaseHelper();
