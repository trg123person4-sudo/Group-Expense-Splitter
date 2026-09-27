import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// In-memory fallback map for local development when Upstash is not configured
const inMemoryMap = new Map<string, { count: number; resetTime: number }>();
let hasLoggedUpstashWarning = false;

// Cache Upstash Ratelimit instances by limit and window
const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (!hasLoggedUpstashWarning && process.env.NODE_ENV !== "test") {
      console.warn(
        "[RateLimiter] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured. " +
          "Falling back to in-memory rate limiting. WARNING: In-memory rate limiting is not durable across multiple serverless instances or deploys."
      );
      hasLoggedUpstashWarning = true;
    }
    return null;
  }

  const key = `${limit}:${windowMs}`;
  if (!upstashLimiters.has(key)) {
    const redis = new Redis({ url, token });
    const seconds = Math.max(1, Math.round(windowMs / 1000));
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${seconds} s`),
      analytics: false,
    });
    upstashLimiters.set(key, limiter);
  }

  return upstashLimiters.get(key)!;
}

/**
 * Check rate limit for a given identifier (e.g. userId or IP).
 * Uses Upstash Redis if configured, falling back to in-memory sliding window for local dev.
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 10, windowMs: 60 * 1000 }
): Promise<RateLimitResult> {
  const upstashLimiter = getUpstashLimiter(options.limit, options.windowMs);

  if (upstashLimiter) {
    try {
      const res = await upstashLimiter.limit(identifier);
      return {
        success: res.success,
        limit: res.limit,
        remaining: res.remaining,
        reset: res.reset,
      };
    } catch (err) {
      console.error("[RateLimiter] Upstash Redis request failed, falling back to in-memory:", err);
      // Fall through to in-memory fallback on network failure
    }
  }

  // In-memory fallback
  const now = Date.now();

  // Periodic cleanup if map grows large
  if (inMemoryMap.size > 2000) {
    for (const [key, val] of inMemoryMap.entries()) {
      if (now > val.resetTime) {
        inMemoryMap.delete(key);
      }
    }
  }

  const entry = inMemoryMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    const resetTime = now + options.windowMs;
    inMemoryMap.set(identifier, { count: 1, resetTime });
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      reset: resetTime,
    };
  }

  if (entry.count >= options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  entry.count += 1;
  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - entry.count,
    reset: entry.resetTime,
  };
}

export function resetRateLimits(): void {
  inMemoryMap.clear();
}
