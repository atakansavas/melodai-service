import { supabase, supabaseService } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

// User context interface for authenticated requests
export interface UserContext {
  id: string;
  email: string;
  role: string;
  metadata: any;
  isAuthenticated: boolean;
  supabaseUser?: User;
}

// Error types for authentication
export const AuthErrorTypes = {
  MISSING_TOKEN: "MISSING_TOKEN",
  INVALID_TOKEN: "INVALID_TOKEN",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  SUPABASE_ERROR: "SUPABASE_ERROR",
} as const;

export type AuthErrorType =
  (typeof AuthErrorTypes)[keyof typeof AuthErrorTypes];

export class AuthError extends Error {
  constructor(
    public type: AuthErrorType,
    public message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// Authentication error responses
export const authErrorResponses = {
  [AuthErrorTypes.MISSING_TOKEN]: {
    message: "Authorization header required",
    statusCode: 401,
  },
  [AuthErrorTypes.INVALID_TOKEN]: {
    message: "Invalid or expired token",
    statusCode: 401,
  },
  [AuthErrorTypes.USER_NOT_FOUND]: {
    message: "User not found",
    statusCode: 404,
  },
  [AuthErrorTypes.TOKEN_EXPIRED]: {
    message: "Token has expired",
    statusCode: 401,
  },
  [AuthErrorTypes.INSUFFICIENT_PERMISSIONS]: {
    message: "Insufficient permissions",
    statusCode: 403,
  },
  [AuthErrorTypes.SUPABASE_ERROR]: {
    message: "Authentication service error",
    statusCode: 500,
  },
};

export class SupabaseAuthHelper {
  private supabaseClient = supabase;
  private serviceClient = supabaseService;

  /**
   * Validate Supabase token and return user if valid
   * Note: This method throws AuthError if validation fails, so it never actually returns null
   */
  async validateToken(token: string): Promise<User> {
    try {
      if (!token || !this.isValidTokenFormat(token)) {
        throw new AuthError(
          AuthErrorTypes.INVALID_TOKEN,
          "Invalid token format"
        );
      }

      // Set the auth token for this request
      const {
        data: { user },
        error,
      } = await this.supabaseClient.auth.getUser(token);

      if (error) {
        console.error("Token validation error:", error);

        if (error.message.includes("expired")) {
          throw new AuthError(
            AuthErrorTypes.TOKEN_EXPIRED,
            "Token has expired"
          );
        }

        throw new AuthError(
          AuthErrorTypes.INVALID_TOKEN,
          "Token validation failed"
        );
      }

      if (!user) {
        throw new AuthError(
          AuthErrorTypes.USER_NOT_FOUND,
          "User not found for token"
        );
      }

      return user;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      console.error("Unexpected error during token validation:", error);
      throw new AuthError(
        AuthErrorTypes.SUPABASE_ERROR,
        "Authentication service error"
      );
    }
  }

  /**
   * Get current user from token with full validation
   */
  async getCurrentUser(token: string): Promise<User> {
    const user = await this.validateToken(token);

    // validateToken already throws if user is null, but TypeScript doesn't know this
    // This check is defensive programming and will never actually be reached
    if (!user) {
      throw new AuthError(
        AuthErrorTypes.USER_NOT_FOUND,
        "Current user not found"
      );
    }

    return user as User;
  }

  /**
   * Get user by ID using service role
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const {
        data: { user },
        error,
      } = await this.serviceClient.auth.admin.getUserById(userId);

      if (error) {
        console.error("Error fetching user by ID:", error);
        return null;
      }

      return user;
    } catch (error) {
      console.error("Unexpected error fetching user by ID:", error);
      return null;
    }
  }

  /**
   * Refresh token using Supabase auth
   */
  async refreshToken(
    refreshToken: string
  ): Promise<{ access_token: string; refresh_token: string; user: User }> {
    try {
      const { data, error } = await this.supabaseClient.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session || !data.user) {
        throw new AuthError(
          AuthErrorTypes.INVALID_TOKEN,
          "Token refresh failed"
        );
      }

      return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: data.user,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      console.error("Unexpected error during token refresh:", error);
      throw new AuthError(
        AuthErrorTypes.SUPABASE_ERROR,
        "Token refresh service error"
      );
    }
  }

  /**
   * Revoke token (sign out user)
   */
  async revokeToken(token: string): Promise<void> {
    try {
      // First validate the token and get user
      const user = await this.validateToken(token);

      if (user) {
        // Use service role to sign out the user
        const { error } = await this.serviceClient.auth.admin.signOut(user.id);

        if (error) {
          console.error("Error revoking token:", error);
          throw new AuthError(
            AuthErrorTypes.SUPABASE_ERROR,
            "Token revocation failed"
          );
        }
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      console.error("Unexpected error during token revocation:", error);
      throw new AuthError(
        AuthErrorTypes.SUPABASE_ERROR,
        "Token revocation service error"
      );
    }
  }

  /**
   * Get comprehensive user context for requests
   */
  async getUserContext(token: string): Promise<UserContext> {
    try {
      const user = await this.getCurrentUser(token);

      // Get additional user metadata from our users table
      let role = "user"; // default role
      let metadata = {};

      try {
        const { data: userRecord, error } = await this.supabaseClient
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!error && userRecord) {
          // Extract role from app_metadata or user_metadata
          role =
            userRecord.app_metadata?.role ||
            user.app_metadata?.role ||
            user.user_metadata?.role ||
            "user";

          metadata = {
            ...userRecord.app_metadata,
            ...userRecord.preferences,
            spotify_profile: userRecord.spotify_profile,
          };
        }
      } catch (dbError) {
        console.warn("Could not fetch additional user metadata:", dbError);
        // Continue with basic user info
      }

      return {
        id: user.id,
        email: user.email || "",
        role,
        metadata,
        isAuthenticated: true,
        supabaseUser: user,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      console.error("Error building user context:", error);
      throw new AuthError(
        AuthErrorTypes.SUPABASE_ERROR,
        "Failed to build user context"
      );
    }
  }

  /**
   * Check if user has specific role or permission
   */
  async hasPermission(token: string, requiredRole: string): Promise<boolean> {
    try {
      const userContext = await this.getUserContext(token);

      // Simple role-based check (extend as needed)
      const roleHierarchy = ["user", "premium", "admin", "super_admin"];
      const userRoleIndex = roleHierarchy.indexOf(userContext.role);
      const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

      return userRoleIndex >= requiredRoleIndex;
    } catch (error) {
      console.error("Error checking permissions:", error);
      return false;
    }
  }

  /**
   * Extract Supabase token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    return authHeader.substring(7);
  }

  /**
   * Validate token format (basic JWT structure check)
   */
  private isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== "string") {
      return false;
    }

    // JWT should have 3 parts separated by dots
    const parts = token.split(".");
    return parts.length === 3 && parts.every((part) => part.length > 0);
  }

  /**
   * Handle authentication errors consistently
   */
  private handleAuthError(error: any): AuthError {
    if (error instanceof AuthError) {
      return error;
    }

    // Map common Supabase auth errors
    if (error?.message?.includes("JWT expired")) {
      return new AuthError(AuthErrorTypes.TOKEN_EXPIRED, "Token has expired");
    }

    if (error?.message?.includes("invalid JWT")) {
      return new AuthError(AuthErrorTypes.INVALID_TOKEN, "Invalid token");
    }

    if (error?.message?.includes("User not found")) {
      return new AuthError(AuthErrorTypes.USER_NOT_FOUND, "User not found");
    }

    // Default to generic auth error
    return new AuthError(
      AuthErrorTypes.SUPABASE_ERROR,
      "Authentication service error"
    );
  }

  /**
   * Create error response object
   */
  createErrorResponse(error: AuthError) {
    const errorConfig = authErrorResponses[error.type];

    return {
      success: false,
      error: error.message,
      type: error.type,
      statusCode: error.statusCode || errorConfig.statusCode,
      timestamp: new Date().toISOString(),
    };
  }
}

// Singleton instance
export const supabaseAuthHelper = new SupabaseAuthHelper();

// Convenience functions
export const validateSupabaseToken = (token: string) =>
  supabaseAuthHelper.validateToken(token);

export const getCurrentSupabaseUser = (token: string) =>
  supabaseAuthHelper.getCurrentUser(token);

export const getSupabaseUserContext = (token: string) =>
  supabaseAuthHelper.getUserContext(token);

export const extractSupabaseToken = (authHeader: string | null) =>
  supabaseAuthHelper.extractTokenFromHeader(authHeader);
