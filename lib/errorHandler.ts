export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
  onOpen?: (failures: number) => void;
  onClose?: () => void;
  onHalfOpen?: () => void;
}

export interface ErrorNotification {
  level: "info" | "warning" | "error" | "critical";
  message: string;
  error?: Error;
  context?: Record<string, unknown>;
  timestamp: Date;
}

class RetryHandler {
  private defaultOptions: Required<RetryOptions> = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryCondition: (error) => {
      if (error && typeof error === "object" && "status" in error) {
        const statusError = error as { status: number };
        return statusError.status >= 500 || statusError.status === 429;
      }
      return true;
    },
    onRetry: () => {},
  };

  async retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: unknown;
    let delay = opts.initialDelay;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt === opts.maxAttempts || !opts.retryCondition(error)) {
          throw error;
        }

        opts.onRetry(error, attempt);

        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
      }
    }

    throw lastError;
  }
}

enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  private options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 10000, // 10 seconds
      onOpen: () => {},
      onClose: () => {},
      onHalfOpen: () => {},
      ...options,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.options.onHalfOpen();
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successCount = 0;
        this.options.onClose();
      }
    } else if (this.state === CircuitState.CLOSED) {
      if (Date.now() - this.lastFailureTime > this.options.monitoringPeriod) {
        this.failures = 0;
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (
      this.failures >= this.options.failureThreshold &&
      this.state !== CircuitState.OPEN
    ) {
      this.state = CircuitState.OPEN;
      this.options.onOpen(this.failures);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

class ErrorLogger {
  private notifications: ErrorNotification[] = [];
  private listeners: ((notification: ErrorNotification) => void)[] = [];

  log(notification: Omit<ErrorNotification, "timestamp">): void {
    const fullNotification: ErrorNotification = {
      ...notification,
      timestamp: new Date(),
    };

    this.notifications.push(fullNotification);

    // Keep only last 1000 notifications
    if (this.notifications.length > 1000) {
      this.notifications.shift();
    }

    // Notify listeners
    this.listeners.forEach((listener) => listener(fullNotification));

    // Console output
    const consoleMethod =
      notification.level === "error" || notification.level === "critical"
        ? "error"
        : notification.level === "warning"
        ? "warn"
        : "log";

    console[consoleMethod](
      `[${notification.level.toUpperCase()}]`,
      notification.message,
      {
        error: notification.error,
        context: notification.context,
      }
    );
  }

  subscribe(listener: (notification: ErrorNotification) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getNotifications(level?: ErrorNotification["level"]): ErrorNotification[] {
    if (level) {
      return this.notifications.filter((n) => n.level === level);
    }
    return [...this.notifications];
  }

  clear(): void {
    this.notifications = [];
  }
}

export class ErrorHandler {
  private retryHandler = new RetryHandler();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private errorLogger = new ErrorLogger();
  private fallbacks = new Map<string, () => unknown>();

  async withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
    return this.retryHandler.retry(fn, options);
  }

  async withCircuitBreaker<T>(
    name: string,
    fn: () => Promise<T>,
    options?: CircuitBreakerOptions
  ): Promise<T> {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(options));
    }

    const breaker = this.circuitBreakers.get(name)!;

    try {
      return await breaker.execute(fn);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        error.message === "Circuit breaker is OPEN"
      ) {
        const fallback = this.fallbacks.get(name);
        if (fallback) {
          this.errorLogger.log({
            level: "warning",
            message: `Circuit breaker ${name} is open, using fallback`,
            context: { service: name },
          });
          return fallback() as T;
        }
      }
      throw error;
    }
  }

  registerFallback(name: string, fallback: () => unknown): void {
    this.fallbacks.set(name, fallback);
  }

  logError(
    level: ErrorNotification["level"],
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void {
    this.errorLogger.log({ level, message, error, context });
  }

  subscribeToErrors(
    listener: (notification: ErrorNotification) => void
  ): () => void {
    return this.errorLogger.subscribe(listener);
  }

  getCircuitBreakerState(name: string): string | undefined {
    return this.circuitBreakers.get(name)?.getState();
  }

  resetCircuitBreaker(name: string): void {
    this.circuitBreakers.get(name)?.reset();
  }

  async withErrorHandling<T>(
    fn: () => Promise<T>,
    options: {
      name: string;
      fallback?: () => T;
      retry?: RetryOptions;
      circuitBreaker?: CircuitBreakerOptions;
    }
  ): Promise<T> {
    const { name, fallback, retry, circuitBreaker } = options;

    if (fallback) {
      this.registerFallback(name, fallback);
    }

    try {
      let operation = fn;

      if (retry) {
        operation = () => this.withRetry(fn, retry);
      }

      if (circuitBreaker) {
        return await this.withCircuitBreaker(name, operation, circuitBreaker);
      }

      return await operation();
    } catch (error) {
      this.logError(
        "error",
        `Operation ${name} failed`,
        error instanceof Error ? error : undefined,
        {
          service: name,
        }
      );

      if (fallback) {
        this.logError("info", `Using fallback for ${name}`, undefined, {
          service: name,
        });
        return fallback();
      }

      throw error;
    }
  }
}

export const errorHandler = new ErrorHandler();
