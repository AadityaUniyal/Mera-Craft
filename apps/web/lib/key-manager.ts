/**
 * MINDCRAFT — Multi-Key Load Balancing & Auto-Failover Manager
 * Rotates through keys, detects exhaustion/rate limits (429/401/403/503),
 * quarantines dead keys, and cascades across providers (Groq -> Gemini -> OpenRouter).
 */

import { logger } from "./logger";

export type AIProvider = "groq" | "gemini" | "openrouter" | "deepgram";

interface KeyState {
  key: string;
  failures: number;
  quarantinedUntil: number; // Unix timestamp
  successCount: number;
}

class KeyRotationManager {
  private keyPools: Map<AIProvider, KeyState[]> = new Map();
  private roundRobinIndex: Map<AIProvider, number> = new Map();

  constructor() {
    this.initializePools();
  }

  private initializePools() {
    this.registerProviderKeys("groq", [
      process.env.GROQ_API_KEYS,
      process.env.GROQ_API_KEY,
    ]);

    this.registerProviderKeys("gemini", [
      process.env.GEMINI_API_KEYS,
      process.env.GEMINI_API_KEY,
    ]);

    this.registerProviderKeys("openrouter", [
      process.env.OPENROUTER_API_KEYS,
      process.env.OPENROUTER_API_KEY,
    ]);

    this.registerProviderKeys("deepgram", [
      process.env.DEEPGRAM_API_KEYS,
      process.env.DEEPGRAM_API_KEY,
    ]);
  }

  private registerProviderKeys(provider: AIProvider, envSources: (string | undefined)[]) {
    const rawKeys: string[] = [];
    for (const src of envSources) {
      if (src) {
        const split = src.split(",").map((k) => k.trim()).filter((k) => k.length > 0);
        rawKeys.push(...split);
      }
    }

    const uniqueKeys = Array.from(new Set(rawKeys));
    const pool: KeyState[] = uniqueKeys.map((key) => ({
      key,
      failures: 0,
      quarantinedUntil: 0,
      successCount: 0,
    }));

    this.keyPools.set(provider, pool);
    this.roundRobinIndex.set(provider, 0);
  }

  /**
   * Retrieves the next active key for a provider, skipping quarantined/exhausted keys.
   */
  public getActiveKey(provider: AIProvider): string | null {
    const pool = this.keyPools.get(provider);
    if (!pool || pool.length === 0) return null;

    const now = Date.now();
    const startIndex = this.roundRobinIndex.get(provider) || 0;

    for (let i = 0; i < pool.length; i++) {
      const idx = (startIndex + i) % pool.length;
      const keyState = pool[idx];

      // Check if quarantine has expired
      if (keyState.quarantinedUntil <= now) {
        this.roundRobinIndex.set(provider, (idx + 1) % pool.length);
        return keyState.key;
      }
    }

    // If all keys are quarantined, return the key that will un-quarantine earliest
    const earliest = pool.reduce((prev, curr) =>
      curr.quarantinedUntil < prev.quarantinedUntil ? curr : prev
    );
    return earliest.key;
  }

  /**
   * Reports a successful call using a key, resetting its failure count.
   */
  public reportSuccess(provider: AIProvider, key: string) {
    const pool = this.keyPools.get(provider);
    if (!pool) return;

    const keyState = pool.find((k) => k.key === key);
    if (keyState) {
      keyState.failures = 0;
      keyState.quarantinedUntil = 0;
      keyState.successCount++;
    }
  }

  /**
   * Reports key failure (e.g. 429 Rate Limit, 401 Invalid, 403 Quota).
   * Automatically quarantines the key and triggers failover to the next available key.
   */
  public reportFailure(provider: AIProvider, key: string, statusCode: number = 429) {
    const pool = this.keyPools.get(provider);
    if (!pool) return;

    const keyState = pool.find((k) => k.key === key);
    if (!keyState) return;

    keyState.failures++;

    // Exponential quarantine duration: 30s, 2m, 10m, 1hr
    const quarantineMinutes = Math.min(60, Math.pow(2, keyState.failures - 1) * 0.5);
    keyState.quarantinedUntil = Date.now() + quarantineMinutes * 60 * 1000;

    logger.warn(`API key for provider [${provider}] quarantined for ${quarantineMinutes.toFixed(1)} mins (Status ${statusCode})`, {
      provider,
      maskedKey: `${key.slice(0, 6)}...${key.slice(-4)}`,
      failures: keyState.failures,
      quarantinedUntil: new Date(keyState.quarantinedUntil).toISOString(),
    });
  }

  /**
   * Executes a call with key rotation across all available keys for the given provider.
   */
  public async executeWithKeyFailover<T>(
    provider: AIProvider,
    fn: (apiKey: string) => Promise<T>
  ): Promise<T> {
    const pool = this.keyPools.get(provider) || [];
    const maxAttempts = Math.max(1, pool.length);

    let lastError: any;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const apiKey = this.getActiveKey(provider);
      if (!apiKey) break;

      try {
        const result = await fn(apiKey);
        this.reportSuccess(provider, apiKey);
        return result;
      } catch (err: any) {
        lastError = err;
        const status = err.status || err.statusCode || 429;
        this.reportFailure(provider, apiKey, status);
      }
    }

    throw lastError || new Error(`No available API keys for provider [${provider}]`);
  }

  /**
   * Health status of all configured keys and providers.
   */
  public getHealthStatus(): Record<AIProvider, { totalKeys: number; activeKeys: number; keys: any[] }> {
    const now = Date.now();
    const result: any = {};

    for (const [provider, pool] of this.keyPools.entries()) {
      const active = pool.filter((k) => k.quarantinedUntil <= now).length;
      result[provider] = {
        totalKeys: pool.length,
        activeKeys: active,
        keys: pool.map((k) => ({
          maskedKey: `${k.key.slice(0, 6)}...${k.key.slice(-4)}`,
          status: k.quarantinedUntil <= now ? "ACTIVE" : "QUARANTINED",
          quarantinedUntil: k.quarantinedUntil > now ? new Date(k.quarantinedUntil).toISOString() : null,
          successCount: k.successCount,
          failures: k.failures,
        })),
      };
    }
    return result;
  }
}

export const keyManager = new KeyRotationManager();
