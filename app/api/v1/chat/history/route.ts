/**
 * Chat History API Route for MelodAI Service
 *
 * Handles retrieving user's chat conversation history with pagination support.
 * Returns 20 items per page by default with comprehensive metadata.
 */

import { errorHandler } from "@/lib/errorHandler";
import { ensureSupabaseConnection } from "@/lib/supabase";
import { supabaseHelper } from "@/lib/supabase-helpers";
import {
  AuthenticatedRequest,
  withMiddleware,
} from "@/middleware/authMiddleware";
import { ChatSessionData } from "@/types/supabase";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Response interface for chat history
interface ChatHistoryResponse {
  success: boolean;
  data?: {
    sessions: Array<{
      id: string;
      created_at: string;
      updated_at: string;
      message_count: number;
      last_message_at: string;
      interaction_type: string;
      preview: {
        first_user_message?: string;
        last_message?: string;
      };
      session_duration_ms: number;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
  meta?: {
    requestId: string;
    responseTime: number;
    timestamp: string;
  };
  error?: string;
  details?: string;
}

/**
 * Check if Supabase is available
 */
async function isSupabaseAvailable(): Promise<boolean> {
  try {
    await ensureSupabaseConnection();
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Supabase not available:", errorMessage);
    return false;
  }
}

/**
 * Transform chat session data for API response
 */
function transformChatSession(session: ChatSessionData) {
  // Get first user message and last message for preview
  const messages = session.messages || [];
  const firstUserMessage = messages.find((msg) => msg.role === "user")?.content;
  const lastMessage =
    messages.length > 0 ? messages[messages.length - 1]?.content : undefined;

  return {
    id: session.id,
    created_at: session.created_at,
    updated_at: session.updated_at,
    message_count: session.session_metadata?.total_messages || messages.length,
    last_message_at:
      session.session_metadata?.last_message_at || session.updated_at,
    interaction_type: session.session_metadata?.interaction_type || "general",
    preview: {
      first_user_message: firstUserMessage
        ? firstUserMessage.length > 100
          ? firstUserMessage.substring(0, 100) + "..."
          : firstUserMessage
        : undefined,
      last_message: lastMessage
        ? lastMessage.length > 100
          ? lastMessage.substring(0, 100) + "..."
          : lastMessage
        : undefined,
    },
    session_duration_ms: session.session_metadata?.session_duration_ms || 0,
  };
}

/**
 * GET /api/v1/chat/history - Get user's chat history with pagination
 * Now uses Supabase token authentication via middleware
 */
export const GET = withMiddleware(
  async (req: AuthenticatedRequest): Promise<NextResponse> => {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      // Extract query parameters
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
      const limit = Math.min(
        50,
        Math.max(1, parseInt(searchParams.get("limit") || "20"))
      );
      const offset = (page - 1) * limit;

      // Get user ID from authenticated request (provided by middleware)
      const userId = req.user.id;

      if (!userId) {
        return NextResponse.json(
          {
            success: false,
            error: "User authentication failed",
            details: "No user ID found in request",
            requestId,
          } as ChatHistoryResponse,
          { status: 401 }
        );
      }

      // Check Supabase availability
      const supabaseAvailable = await isSupabaseAvailable();
      if (!supabaseAvailable) {
        return NextResponse.json(
          {
            success: false,
            error: "Database service unavailable",
            details: "Supabase connection failed",
            requestId,
          } as ChatHistoryResponse,
          { status: 503 }
        );
      }

      // Get user's chat sessions with pagination using the authenticated user ID
      let chatSessions: ChatSessionData[];
      try {
        chatSessions = await errorHandler.withCircuitBreaker(
          "supabase-operation",
          () =>
            supabaseHelper.getUserChatSessions(userId, {
              limit: limit + 1, // Get one extra to check if there are more
              offset,
              orderBy: "updated_at",
              ascending: false,
            }),
          { failureThreshold: 3, resetTimeout: 30000 }
        );
      } catch (error) {
        console.error("Failed to get chat sessions:", error);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to retrieve chat history",
            details: "Database query failed",
            requestId,
          } as ChatHistoryResponse,
          { status: 500 }
        );
      }

      // Check if there are more items
      const hasMore = chatSessions.length > limit;
      const sessions = hasMore ? chatSessions.slice(0, limit) : chatSessions;

      // Transform sessions for response
      const transformedSessions = sessions.map(transformChatSession);

      // Calculate total count (approximate for performance)
      const totalCount = offset + sessions.length + (hasMore ? 1 : 0);

      const responseTime = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        data: {
          sessions: transformedSessions,
          pagination: {
            page,
            limit,
            total: totalCount,
            hasMore,
          },
        },
        meta: {
          requestId,
          responseTime,
          timestamp: new Date().toISOString(),
        },
      } as ChatHistoryResponse);
    } catch (error) {
      console.error("Unexpected error in chat history handler:", error);
      const responseTime = Date.now() - startTime;

      return NextResponse.json(
        {
          success: false,
          error: "Internal server error",
          details: "An unexpected error occurred",
          requestId,
          meta: {
            requestId,
            responseTime,
            timestamp: new Date().toISOString(),
          },
        } as ChatHistoryResponse,
        { status: 500 }
      );
    }
  },
  {
    // Middleware configuration
    publicPaths: [], // No public paths for this endpoint
    requiredRole: "user", // Require at least user role
    skipUserContext: false, // We need full user context
  }
);
