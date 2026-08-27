/**
 * MINDCRAFT — Circuit Breaker & Resilience Utilities
 * Implements fault tolerance, exponential backoff with jitter,
 * and circuit-breaking state machines to protect upstream and downstream systems.
 */

export enum CircuitState {
  CLOSED = "CLOSED", // Normal operations
  OPEN = "OPEN",     // Failing fast
  HALF_OPEN = "HALF_OPEN", // Testing recovery
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Consecutive failures before opening circuit (default: 4)
  resetTimeoutMs?: number;   // Time to wait before attempting recovery (default: 20000ms)
  timeoutMs?: number;        // Individual call timeout (default: 5000ms)
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private nextAttempt: number = Date.now();
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly timeoutMs: number;
  public readonly name: string;

  constructor(name: string, options?: CircuitBreakerOptions) {
    this.name = name;
    this.failureThreshold = options?.failureThreshold || 4;
    this.resetTimeoutMs = options?.resetTimeoutMs || 20000;
    this.timeoutMs = options?.timeoutMs || 5000;
  }

  public getState(): CircuitState {
    if (this.state === CircuitState.OPEN && Date.now() >= this.nextAttempt) {
      this.state = CircuitState.HALF_OPEN;
    }
    return this.state;
  }

  public async execute<T>(action: () => Promise<T>, fallback?: () => T | Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === CircuitState.OPEN) {
      if (fallback) return fallback();
      throw new Error(`CircuitBreaker [${this.name}] is OPEN. Failing fast.`);
    }

    try {
      const result = await Promise.race([
        action(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`CircuitBreaker [${this.name}] timed out`)), this.timeoutMs)
        ),
      ]);

      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      if (fallback) return fallback();
      throw err;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold || this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.resetTimeoutMs;
    }
  }
}

/**
 * Executes an async operation with exponential jittered backoff.
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 200,
  backoffFactor: number = 2
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        // Add random full jitter
        const delay = Math.random() * (baseDelayMs * Math.pow(backoffFactor, attempt));
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// Global AI Circuit Breaker instance
export const aiCircuitBreaker = new CircuitBreaker("LLM_EXPLAIN_API", {
  failureThreshold: 3,
  resetTimeoutMs: 15000,
  timeoutMs: 4000,
});
