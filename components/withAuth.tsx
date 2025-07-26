'use client';

import { useEffect, useState, ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { authManager } from '@/lib/auth';

export interface WithAuthOptions {
  redirectTo?: string;
  fallback?: React.ReactNode;
  onAuthCheck?: (isAuthenticated: boolean) => void;
}

export function withAuth<P extends object>(
  Component: ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const { redirectTo = '/login', fallback = null, onAuthCheck } = options;

  return function AuthenticatedComponent(props: P) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
      const checkAuth = async () => {
        try {
          const token = await authManager.getValidToken();
          const authenticated = !!token;
          
          setIsAuthenticated(authenticated);
          
          if (onAuthCheck) {
            onAuthCheck(authenticated);
          }
          
          if (!authenticated) {
            router.push(redirectTo);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          router.push(redirectTo);
        } finally {
          setIsLoading(false);
        }
      };

      checkAuth();
    }, [router]);

    if (isLoading) {
      return fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <Component {...props} />;
  };
}