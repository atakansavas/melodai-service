import { errorHandler } from "@/lib/errorHandler";
import { qdrantDB } from "@/lib/qdrant";
import {
  AuthenticatedRequest,
  createAuthMiddleware,
} from "@/middleware/authMiddleware";
import { withLogging } from "@/middleware/logger";
import { NextRequest, NextResponse } from "next/server";

// Create auth middleware with configuration
const authMiddleware = createAuthMiddleware({
  publicPaths: ["/api/public"],
  tokenValidator: async () => {
    // Example: Validate token with your auth service
    // const user = await validateJWT(token);
    // return user;

    // For demo purposes, we'll just return a mock user
    return { id: "123", email: "user@example.com" };
  },
});

// Example protected API route with all features integrated
export async function POST(request: NextRequest) {
  return withLogging(async (req: NextRequest) => {
    return authMiddleware(
      req,
      async (authenticatedReq: AuthenticatedRequest) => {
        try {
          const body = await authenticatedReq.json();

          // Example: Store vector in Qdrant with error handling
          const result = await errorHandler.withErrorHandling(
            async () => {
              // Ensure collection exists
              await qdrantDB.createCollection("example_collection", 1536); // 1536 for OpenAI embeddings

              // Upsert vector
              await qdrantDB.upsertVectors("example_collection", [
                {
                  id: Date.now(),
                  vector: body.vector || Array(1536).fill(0.1), // Example vector
                  payload: {
                    userId: authenticatedReq.user?.id,
                    text: body.text,
                    timestamp: new Date().toISOString(),
                  },
                },
              ]);

              // Search similar vectors
              const searchResults = await qdrantDB.search(
                "example_collection",
                body.queryVector || Array(1536).fill(0.1),
                { limit: 5 }
              );

              return searchResults;
            },
            {
              name: "qdrant-operation",
              retry: {
                maxAttempts: 3,
                onRetry: (error, attempt) => {
                  console.log(`Retrying Qdrant operation, attempt ${attempt}`);
                },
              },
              circuitBreaker: {
                failureThreshold: 5,
                resetTimeout: 60000,
              },
              fallback: () => {
                // Return empty search results array with proper structure
                return [];
              },
            }
          );

          return NextResponse.json({
            success: true,
            user: authenticatedReq.user,
            results: result,
          });
        } catch (error) {
          errorHandler.logError("error", "API request failed", error as Error, {
            userId: authenticatedReq.user?.id,
            path: authenticatedReq.url,
          });

          return NextResponse.json(
            {
              error: "Internal server error",
              message: (error as Error).message,
            },
            { status: 500 }
          );
        }
      }
    );
  })(request);
}

// Example public endpoint
export async function GET(request: NextRequest) {
  return withLogging(async () => {
    return NextResponse.json({
      message: "This is a public endpoint",
      status: "healthy",
      services: {
        qdrant:
          errorHandler.getCircuitBreakerState("qdrant-operation") || "UNKNOWN",
      },
    });
  })(request);
}
