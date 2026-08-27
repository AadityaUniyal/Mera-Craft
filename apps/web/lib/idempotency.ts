/**
 * MINDCRAFT — Idempotency Key Manager
 * Ensures mutation operations (such as game save and telemetry batches)
 * are executed at-most-once when clients retry over flaky network connections.
 */

interface CachedIdempotentResponse {
  statusCode: number;
  data: any;
  timestamp: number;
}

class IdempotencyManager {
  private cache: Map<string, CachedIdempotentResponse> = new Map();
  private ttlMs: number = 5 * 60 * 1000; // 5 minutes retention
  private lastCleanup: number = Date.now();

  /**
   * Retrieves cached response if the idempotency key was previously processed.
   */
  public get(key: string): CachedIdempotentResponse | null {
    this.cleanupIfNeeded();
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return item;
  }

  /**
   * Caches the completed response for an idempotency key.
   */
  public set(key: string, statusCode: number, data: any): void {
    this.cleanupIfNeeded();
    this.cache.set(key, {
      statusCode,
      data,
      timestamp: Date.now(),
    });
  }

  private cleanupIfNeeded() {
    const now = Date.now();
    if (now - this.lastCleanup < 60000) return;
    this.lastCleanup = now;

    const threshold = now - this.ttlMs;
    for (const [key, val] of this.cache.entries()) {
      if (val.timestamp < threshold) {
        this.cache.delete(key);
      }
    }
  }
}

export const idempotency = new IdempotencyManager();
