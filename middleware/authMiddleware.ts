import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email?: string;
    [key: string]: any;
  };
}

export interface AuthMiddlewareConfig {
  publicPaths?: string[];
  tokenValidator?: (token: string) => Promise<any>;
  onError?: (error: Error) => NextResponse;
}

export function createAuthMiddleware(config: AuthMiddlewareConfig = {}) {
  const {
    publicPaths = [],
    tokenValidator,
    onError = (error) => NextResponse.json({ error: error.message }, { status: 401 })
  } = config;

  return async function authMiddleware(
    request: NextRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const pathname = request.nextUrl.pathname;
    
    if (publicPaths.some(path => pathname.startsWith(path))) {
      return handler(request as AuthenticatedRequest);
    }

    try {
      const authHeader = request.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
      }

      const token = authHeader.substring(7);
      
      if (tokenValidator) {
        const user = await tokenValidator(token);
        (request as AuthenticatedRequest).user = user;
      }

      return handler(request as AuthenticatedRequest);
    } catch (error) {
      return onError(error as Error);
    }
  };
}

export async function validateJWT(token: string): Promise<any> {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  try {
    const response = await fetch(`${process.env.AUTH_SERVICE_URL}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error('Invalid token');
    }

    return response.json();
  } catch (error) {
    throw new Error('Token validation failed');
  }
}