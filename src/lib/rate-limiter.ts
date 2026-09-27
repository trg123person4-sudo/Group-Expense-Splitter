interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit for a given identifier (e.g. userId or IP).
 * Uses in-memory sliding window counter.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 10, windowMs: 60 * 1000 }
): RateLimitResult {
  const now = Date.now();

  // Periodic cleanup if map grows large
  if (rateLimitMap.size > 2000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }

  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    const resetTime = now + options.windowMs;
    rateLimitMap.set(identifier, { count: 1, resetTime });
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
  rateLimitMap.clear();
}
