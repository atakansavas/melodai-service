import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export interface LogEntry {
  id: string;
  timestamp: string;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
    ip?: string;
    userAgent?: string;
  };
  response?: {
    status: number;
    headers: Record<string, string>;
    bodySize: number;
    duration: number;
  };
  error?: {
    message: string;
    stack?: string;
  };
}

export interface LoggerConfig {
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  excludePaths?: string[];
  excludeHeaders?: string[];
  maxBodyLogSize?: number;
  logger?: (entry: LogEntry) => void | Promise<void>;
}

class RequestLogger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      logLevel: 'info',
      excludePaths: ['/health', '/metrics'],
      excludeHeaders: ['authorization', 'cookie', 'x-api-key'],
      maxBodyLogSize: 10240, // 10KB
      logger: (entry) => console.log(JSON.stringify(entry)),
      ...config
    };
  }

  private sanitizeHeaders(headers: Headers): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    headers.forEach((value, key) => {
      if (!this.config.excludeHeaders?.includes(key.toLowerCase())) {
        sanitized[key] = value;
      } else {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private async getRequestBody(request: NextRequest): Promise<any> {
    try {
      const contentType = request.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        const body = await request.text();
        if (body.length > this.config.maxBodyLogSize!) {
          return { message: '[Body too large to log]', size: body.length };
        }
        return JSON.parse(body);
      }
      
      return undefined;
    } catch (error) {
      return { error: 'Failed to parse request body' };
    }
  }

  async logRequest(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const requestId = randomUUID();
    
    const pathname = request.nextUrl.pathname;
    if (this.config.excludePaths?.some(path => pathname.startsWith(path))) {
      return handler(request);
    }

    const logEntry: LogEntry = {
      id: requestId,
      timestamp: new Date().toISOString(),
      request: {
        method: request.method,
        url: request.url,
        headers: this.sanitizeHeaders(request.headers),
        ip: request.ip || request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      }
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const clonedRequest = request.clone();
      logEntry.request.body = await this.getRequestBody(clonedRequest);
    }

    try {
      const response = await handler(request);
      const duration = Date.now() - startTime;
      
      const clonedResponse = response.clone();
      const responseBody = await clonedResponse.text();
      
      logEntry.response = {
        status: response.status,
        headers: this.sanitizeHeaders(response.headers),
        bodySize: responseBody.length,
        duration
      };

      response.headers.set('X-Request-ID', requestId);
      response.headers.set('X-Response-Time', `${duration}ms`);

      await this.config.logger!(logEntry);
      
      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logEntry.error = {
        message: error.message,
        stack: error.stack
      };
      
      logEntry.response = {
        status: 500,
        headers: {},
        bodySize: 0,
        duration
      };

      await this.config.logger!(logEntry);
      
      return NextResponse.json(
        { error: 'Internal Server Error', requestId },
        { 
          status: 500,
          headers: {
            'X-Request-ID': requestId,
            'X-Response-Time': `${duration}ms`
          }
        }
      );
    }
  }
}

export const requestLogger = new RequestLogger();

export function createLoggingMiddleware(config?: LoggerConfig) {
  const logger = new RequestLogger(config);
  
  return async function loggingMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return logger.logRequest(request, handler);
  };
}

export function withLogging(handler: (req: NextRequest) => Promise<NextResponse>) {
  return (req: NextRequest) => requestLogger.logRequest(req, handler);
}