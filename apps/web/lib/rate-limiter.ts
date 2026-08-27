/**
 * MINDCRAFT — In-Memory Sliding Window Rate Limiter
 * Provides scalable, zero-dependency token/sliding window rate limiting
 * with automatic bucket eviction and standard HTTP rate limit headers.
 */

interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

class SlidingWindowRateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private lastCleanup: number = Date.now();
  private cleanupIntervalMs: number = 60000; // prune stale entries every 60s

  /**
   * Checks whether an identifier (e.g. IP or User ID) is allowed under maxRequests / windowMs.
   */
  public check(identifier: string, limit: number, windowMs: number = 60000): RateLimitResult {
    const now = Date.now();
    this.cleanupIfNeeded(now, windowMs);

    const record = this.store.get(identifier) || { timestamps: [] };
    
    // Filter timestamps within current sliding window
    const windowStart = now - windowMs;
    const validTimestamps = record.timestamps.filter((ts) => ts > windowStart);

    const allowed = validTimestamps.length < limit;

    if (allowed) {
      validTimestamps.push(now);
    }

    this.store.set(identifier, { timestamps: validTimestamps });

    const remaining = Math.max(0, limit - validTimestamps.length);
    const oldestTimestamp = validTimestamps[0] || now;
    const resetSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

    return {
      allowed,
      limit,
      remaining,
      resetSeconds: Math.max(1, resetSeconds),
    };
  }

  private cleanupIfNeeded(now: number, windowMs: number) {
    if (now - this.lastCleanup < this.cleanupIntervalMs) return;
    this.lastCleanup = now;

    const threshold = now - windowMs;
    for (const [key, record] of this.store.entries()) {
      const valid = record.timestamps.filter((ts) => ts > threshold);
      if (valid.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, { timestamps: valid });
      }
    }
  }
}

// Global singleton instance
export const rateLimiter = new SlidingWindowRateLimiter();
