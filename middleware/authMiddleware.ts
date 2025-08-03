import {
  AuthError,
  AuthErrorTypes,
  supabaseAuthHelper,
  UserContext,
} from "@/lib/supabase-auth";
import { NextRequest, NextResponse } from "next/server";

// Enhanced authenticated request interface with full user context
export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email?: string;
    [key: string]: any;
  };
  userContext: UserContext;
}

export interface AuthMiddlewareConfig {
  publicPaths?: string[];
  requiredRole?: string;
  onError?: (error: AuthError) => NextResponse;
  skipUserContext?: boolean; // For when you only need basic auth
}

/**
 * Apply Supabase authentication to request
 */
export async function applySupabaseAuth(
  req: NextRequest,
  res?: NextResponse
): Promise<{
  success: boolean;
  user?: any;
  context?: UserContext;
  error?: any;
}> {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthError(
        AuthErrorTypes.MISSING_TOKEN,
        "Authorization header required"
      );
    }

    const token = authHeader.substring(7);

    // Validate token and get user
    const user = await supabaseAuthHelper.validateToken(token);

    if (!user) {
      throw new AuthError(AuthErrorTypes.USER_NOT_FOUND, "User not found");
    }

    // Get full user context
    const userContext = await supabaseAuthHelper.getUserContext(token);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        ...user.user_metadata,
        ...user.app_metadata,
      },
      context: userContext,
    };
  } catch (error) {
    console.error("Authentication failed:", error);

    if (error instanceof AuthError) {
      return { success: false, error };
    }

    return {
      success: false,
      error: new AuthError(
        AuthErrorTypes.SUPABASE_ERROR,
        "Authentication service error"
      ),
    };
  }
}

/**
 * Create enhanced auth middleware with Supabase integration
 */
export function createAuthMiddleware(config: AuthMiddlewareConfig = {}) {
  const {
    publicPaths = [],
    requiredRole,
    skipUserContext = false,
    onError = (error: AuthError) => {
      const errorResponse = supabaseAuthHelper.createErrorResponse(error);
      return NextResponse.json(errorResponse, {
        status: errorResponse.statusCode,
      });
    },
  } = config;

  return async function authMiddleware(
    request: NextRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const pathname = request.nextUrl.pathname;

    // Skip auth for public paths
    if (publicPaths.some((path) => pathname.startsWith(path))) {
      return handler(request as AuthenticatedRequest);
    }

    try {
      // Apply Supabase authentication
      const authResult = await applySupabaseAuth(request);

      if (!authResult.success) {
        return onError(authResult.error);
      }

      // Check role-based permissions if required
      if (requiredRole && authResult.context) {
        const hasPermission = await supabaseAuthHelper.hasPermission(
          supabaseAuthHelper.extractTokenFromHeader(
            request.headers.get("authorization")
          ) || "",
          requiredRole
        );

        if (!hasPermission) {
          const permissionError = new AuthError(
            AuthErrorTypes.INSUFFICIENT_PERMISSIONS,
            `Required role: ${requiredRole}`
          );
          return onError(permissionError);
        }
      }

      // Attach user context to request
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = authResult.user!;
      authenticatedRequest.userContext = authResult.context!;

      return handler(authenticatedRequest);
    } catch (error) {
      console.error("Middleware error:", error);

      const authError =
        error instanceof AuthError
          ? error
          : new AuthError(
              AuthErrorTypes.SUPABASE_ERROR,
              "Authentication middleware error"
            );

      return onError(authError);
    }
  };
}

/**
 * Enhanced middleware function that applies multiple layers
 */
export function withMiddleware(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  config: AuthMiddlewareConfig = {}
) {
  const authMiddleware = createAuthMiddleware(config);

  return async (req: NextRequest) => {
    return authMiddleware(req, handler);
  };
}

/**
 * Legacy function - now uses Supabase instead of external service
 * @deprecated Use supabaseAuthHelper.validateToken instead
 */
export async function validateJWT(token: string): Promise<any> {
  console.warn(
    "validateJWT is deprecated. Use supabaseAuthHelper.validateToken instead."
  );

  try {
    const user = await supabaseAuthHelper.validateToken(token);
    return user;
  } catch (error) {
    if (error instanceof AuthError) {
      throw new Error(error.message);
    }
    throw new Error("Token validation failed");
  }
}

/**
 * Extract Supabase token from request
 */
export function extractSupabaseToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  return supabaseAuthHelper.extractTokenFromHeader(authHeader);
}

/**
 * Validate token format
 */
export function validateTokenFormat(token: string): boolean {
  if (!token || typeof token !== "string") {
    return false;
  }

  // JWT should have 3 parts separated by dots
  const parts = token.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}
