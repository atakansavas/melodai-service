import { errorHandler } from "@/lib/errorHandler";
import { ensureSupabaseConnection } from "@/lib/supabase";
import { supabaseHelper } from "@/lib/supabase-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Example: Test Supabase connection
    await ensureSupabaseConnection();

    // Example: Get health check and stats from Supabase
    console.log("Testing Supabase operations");
    const health = await supabaseHelper.healthCheck();

    // Example: Test database operations
    const [userCount, sessionCount] = await Promise.all([
      supabaseHelper.count("users"),
      supabaseHelper.count("chat_sessions"),
    ]);

    const stats = {
      total_users: userCount,
      total_sessions: sessionCount,
    };

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        message: "Supabase operations successful",
        data: {
          supabase_status: health.healthy ? "connected" : "disconnected",
          response_time_ms: responseTime,
          stats: stats,
          circuit_breakers: {
            supabase:
              errorHandler.getCircuitBreakerState("supabase-operation") ||
              "UNKNOWN",
          },
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Example API error:", error);

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: "Supabase operation failed",
        details: error.message || "Unknown error",
        code: error.code || "UNKNOWN_ERROR",
        meta: {
          response_time_ms: responseTime,
          supabase:
            errorHandler.getCircuitBreakerState("supabase-operation") ||
            "UNKNOWN",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
