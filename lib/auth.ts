export interface AuthToken {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

export interface AuthConfig {
  tokenKey?: string;
  refreshTokenKey?: string;
  baseURL?: string;
  onTokenRefresh?: (token: AuthToken) => void;
  onAuthError?: (error: Error) => void;
}

class AuthManager {
  private config: AuthConfig;
  private refreshPromise: Promise<AuthToken> | null = null;

  constructor(config: AuthConfig = {}) {
    this.config = {
      tokenKey: 'auth_token',
      refreshTokenKey: 'refresh_token',
      baseURL: process.env.NEXT_PUBLIC_API_URL || '',
      ...config
    };
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.config.tokenKey!);
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.config.refreshTokenKey!);
  }

  setToken(token: string, expiresIn?: number): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(this.config.tokenKey!, token);
    
    if (expiresIn) {
      const expiresAt = Date.now() + (expiresIn * 1000);
      localStorage.setItem(`${this.config.tokenKey}_expires_at`, expiresAt.toString());
    }
  }

  setRefreshToken(refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.config.refreshTokenKey!, refreshToken);
  }

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.config.tokenKey!);
    localStorage.removeItem(this.config.refreshTokenKey!);
    localStorage.removeItem(`${this.config.tokenKey}_expires_at`);
  }

  isTokenExpired(): boolean {
    if (typeof window === 'undefined') return true;
    
    const expiresAtStr = localStorage.getItem(`${this.config.tokenKey}_expires_at`);
    if (!expiresAtStr) return false;
    
    const expiresAt = parseInt(expiresAtStr);
    return Date.now() >= expiresAt - 60000; // Refresh 1 minute before expiry
  }

  async refreshToken(): Promise<AuthToken> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = fetch(`${this.config.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to refresh token');
        }
        const data = await response.json();
        const authToken: AuthToken = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_in ? Date.now() + (data.expires_in * 1000) : undefined,
        };
        
        this.setToken(authToken.access_token, data.expires_in);
        if (authToken.refresh_token) {
          this.setRefreshToken(authToken.refresh_token);
        }
        
        if (this.config.onTokenRefresh) {
          this.config.onTokenRefresh(authToken);
        }
        
        return authToken;
      })
      .catch(() => {
        this.clearTokens();
        if (this.config.onAuthError) {
          this.config.onAuthError(error);
        }
        throw error;
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  async getValidToken(): Promise<string | null> {
    const token = this.getToken();
    if (!token) return null;

    if (this.isTokenExpired()) {
      try {
        const newToken = await this.refreshToken();
        return newToken.access_token;
      } catch {
        return null;
      }
    }

    return token;
  }

  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getValidToken();
    
    if (!token) {
      throw new Error('No valid authentication token');
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);

    return fetch(url, {
      ...options,
      headers,
    });
  }
}

export const authManager = new AuthManager();

export const configureAuth = (config: AuthConfig) => {
  Object.assign(authManager, new AuthManager(config));
};

export const tokenInterceptor = async (config: RequestInit): Promise<RequestInit> => {
  const token = await authManager.getValidToken();
  
  if (token) {
    const headers = new Headers(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }
  
  return config;
};