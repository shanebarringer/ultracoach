import { Redis } from '@upstash/redis'

import { createLogger } from '@/lib/logger'

const logger = createLogger('RedisRateLimiter')

// Initialize Redis client with environment variables
// For local development without Redis, gracefully fallback to in-memory rate limiter
let redis: Redis | null = null

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    logger.info('Redis rate limiter initialized with Upstash')
  } else {
    logger.warn(
      'Redis credentials not found - falling back to in-memory rate limiting (not suitable for production)'
    )
  }
} catch (error) {
  logger.error('Failed to initialize Redis client:', error)
  logger.warn('Falling back to in-memory rate limiting')
}

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  max: number // Maximum requests per window
  keyGenerator?: (identifier: string) => string // Custom key generation
}

// Discriminated union for type-safe rate limit results
// When allowed=true, retryAfter is always 0
// When allowed=false, retryAfter is always positive
export type RateLimitResult =
  | {
      allowed: true
      remaining: number
      resetTime: number
      retryAfter: 0
      limit: number
    }
  | {
      allowed: false
      remaining: 0
      resetTime: number
      retryAfter: number // Always positive when rate limited
      limit: number
    }

/**
 * Redis-based rate limiter for distributed environments
 * Automatically falls back to in-memory rate limiting if Redis is unavailable
 */
export class RedisRateLimiter {
  private windowMs: number
  private max: number
  private keyGenerator: (identifier: string) => string
  private memoryStore: Map<string, { count: number; resetTime: number }>
  private lastCleanup: number
  private cleanupInterval: number

  constructor(options: RateLimitOptions) {
    this.windowMs = options.windowMs
    this.max = options.max
    this.keyGenerator = options.keyGenerator || ((id: string) => id)
    this.memoryStore = new Map() // Fallback for when Redis is unavailable
    this.lastCleanup = Date.now()
    this.cleanupInterval = Math.max(60000, this.windowMs) // Cleanup at most once per minute or window duration
  }

  /**
   * Check if request is allowed for given identifier
   * Uses Redis if available, otherwise falls back to in-memory storage
   */
  async check(identifier: string): Promise<RateLimitResult> {
    const key = `ratelimit:${this.keyGenerator(identifier)}`
    const now = Date.now()

    // Use Redis if available
    if (redis) {
      return await this.checkRedis(key, now)
    }

    // Fallback to in-memory rate limiting
    return this.checkMemory(key, now)
  }

  /**
   * Redis-based rate limiting (production-ready, scales horizontally)
   */
  private async checkRedis(key: string, now: number): Promise<RateLimitResult> {
    try {
      // Use Redis INCR with TTL for atomic rate limiting
      const count = await redis!.incr(key)

      // Set expiration on first request in window
      if (count === 1) {
        await redis!.expire(key, Math.ceil(this.windowMs / 1000))
      }

      // Get TTL to calculate reset time
      // Note: TTL can return -2 (key doesn't exist), -1 (no expiration), 0 (expired), or positive (seconds remaining)
      const ttl = await redis!.ttl(key)

      // Normalize TTL edge cases to prevent invalid resetTime
      let safeTTL: number
      if (ttl > 0) {
        // Normal case: key exists with TTL
        safeTTL = ttl
      } else {
        // Edge cases: Use full window duration as fallback
        safeTTL = Math.ceil(this.windowMs / 1000)

        // Log edge cases for debugging
        if (ttl === -2) {
          logger.debug('Redis key does not exist during TTL check', { key, count })
        } else if (ttl === -1) {
          logger.warn('Redis key has no expiration set', { key, count })
        } else if (ttl === 0) {
          logger.debug('Redis key expired during TTL check', { key, count })
        }
      }

      const resetTime = now + safeTTL * 1000

      if (count > this.max) {
        const retryAfter = Math.ceil((resetTime - now) / 1000)

        logger.warn('Rate limit exceeded (Redis)', {
          key,
          count,
          max: this.max,
          retryAfter,
        })

        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter,
          limit: this.max,
        }
      }

      logger.debug('Rate limit check passed (Redis)', {
        key,
        count,
        max: this.max,
        remaining: this.max - count,
      })

      return {
        allowed: true,
        remaining: Math.max(0, this.max - count),
        resetTime,
        retryAfter: 0, // No retry needed when request is allowed
        limit: this.max,
      }
    } catch (error) {
      logger.error('Redis rate limiting failed, falling back to memory:', error)
      // Fallback to in-memory if Redis fails
      return this.checkMemory(key, now)
    }
  }

  /**
   * In-memory rate limiting (fallback, single-instance only)
   * Uses lazy cleanup strategy to avoid O(n) scans on every request
   */
  private checkMemory(key: string, now: number): RateLimitResult {
    // Lazy cleanup: Only trigger cleanup periodically (not on every request)
    // This reduces average-case time complexity from O(n) to O(1)
    if (now - this.lastCleanup > this.cleanupInterval) {
      // Schedule cleanup asynchronously to avoid blocking current request
      // Use setTimeout(0) instead of setImmediate for Edge Runtime compatibility
      setTimeout(() => this.cleanupMemory(now), 0)
      this.lastCleanup = now
    }

    // Get or create rate limit entry
    let entry = this.memoryStore.get(key)
    if (!entry || entry.resetTime <= now) {
      // Create new entry or reset expired one
      entry = {
        count: 0,
        resetTime: now + this.windowMs,
      }
    }

    // Check if request is allowed
    if (entry.count >= this.max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
      logger.warn('Rate limit exceeded (memory)', {
        key,
        count: entry.count,
        max: this.max,
        retryAfter,
      })

      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter,
        limit: this.max,
      }
    }

    // Allow request and increment counter
    entry.count++
    this.memoryStore.set(key, entry)

    logger.debug('Rate limit check passed (memory)', {
      key,
      count: entry.count,
      max: this.max,
      remaining: this.max - entry.count,
    })

    return {
      allowed: true,
      remaining: this.max - entry.count,
      resetTime: entry.resetTime,
      retryAfter: 0, // No retry needed when request is allowed
      limit: this.max,
    }
  }

  /**
   * Clean up expired rate limit entries from memory
   */
  private cleanupMemory(now: number): void {
    for (const [key, entry] of this.memoryStore.entries()) {
      if (entry.resetTime <= now) {
        this.memoryStore.delete(key)
      }
    }
  }

  /**
   * Reset rate limit for specific identifier (admin function)
   * Clears both Redis and memory stores to ensure complete reset
   */
  async reset(identifier: string): Promise<void> {
    const key = `ratelimit:${this.keyGenerator(identifier)}`

    // Always clear memory store (may have fallback entries)
    this.memoryStore.delete(key)

    // Also clear Redis if configured
    if (redis) {
      try {
        await redis.del(key)
        logger.info('Rate limit reset (both Redis and memory)', { key })
      } catch (error) {
        logger.error('Failed to reset rate limit in Redis (memory cleared)', { key, error })
      }
    } else {
      logger.info('Rate limit reset (memory only)', { key })
    }
  }

  /**
   * Get current statistics for identifier
   */
  async getStats(
    identifier: string
  ): Promise<{ count: number; remaining: number; resetTime: number } | null> {
    const key = `ratelimit:${this.keyGenerator(identifier)}`

    if (redis) {
      try {
        const count = await redis.get<number>(key)
        // Defensive check: Only return null if Redis has no key (count is null/undefined)
        // count=0 is a valid state meaning "no requests yet in current window"
        if (count === null || count === undefined) return null

        // Get TTL with defensive handling for edge cases
        const ttl = await redis.ttl(key)
        // Defensive handling: If TTL is invalid, use full window duration
        const safeTTL = ttl > 0 ? ttl : Math.ceil(this.windowMs / 1000)
        const resetTime = Date.now() + safeTTL * 1000

        return {
          count,
          remaining: Math.max(0, this.max - count),
          resetTime,
        }
      } catch (error) {
        logger.error('Failed to get rate limit stats from Redis:', error)
        return null
      }
    } else {
      const entry = this.memoryStore.get(key)
      if (!entry) return null

      return {
        count: entry.count,
        remaining: Math.max(0, this.max - entry.count),
        resetTime: entry.resetTime,
      }
    }
  }
}

// Pre-configured rate limiters for different operations
export const raceImportLimiter = new RedisRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 imports per 15 minutes per user
  keyGenerator: (userId: string) => `race_import:${userId}`,
})

export const raceBulkImportLimiter = new RedisRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 2, // 2 bulk imports per hour per user
  keyGenerator: (userId: string) => `race_bulk_import:${userId}`,
})

// General API rate limiter
export const apiLimiter = new RedisRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per user
  keyGenerator: (userId: string) => `api:${userId}`,
})

// Feedback submission rate limiter (prevent spam)
export const feedbackLimiter = new RedisRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 feedback submissions per hour per user
  keyGenerator: (userId: string) => `feedback:${userId}`,
})

// Message sending rate limiter (prevent spam)
export const messageLimiter = new RedisRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute per user
  keyGenerator: (userId: string) => `messages:${userId}`,
})

/**
 * Utility function to add rate limit headers to response
 * Mutates the response headers directly to avoid stream reusability issues
 */
export function addRateLimitHeaders<T extends Response>(response: T, result: RateLimitResult): T {
  // Use the configured limit directly from result (no reconstruction needed)
  response.headers.set('X-RateLimit-Limit', String(result.limit))
  response.headers.set('X-RateLimit-Remaining', String(result.remaining))
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)))

  if (result.retryAfter > 0) {
    response.headers.set('Retry-After', String(result.retryAfter))
  }

  return response
}

/**
 * Format retry-after duration into human-readable text
 * IMPORTANT: Input must be in seconds (API standard)
 * Converts to minutes for display when duration > 60 seconds
 *
 * All endpoints must use seconds for retryAfter API field (X-RateLimit-Retry-After header)
 * This function only handles display formatting for user-facing messages
 */
export function formatRetryAfter(retryAfterSeconds: number | undefined): string {
  // Defensive guard: Handle undefined/null (should never happen with discriminated union, but be safe)
  if (retryAfterSeconds === undefined || retryAfterSeconds === null) {
    logger.warn('formatRetryAfter called with undefined/null retryAfter, using default 60s')
    return '1 minute'
  }

  // Ensure positive value
  const safeSeconds = Math.max(1, Math.ceil(retryAfterSeconds))

  // Format as minutes if > 60 seconds
  if (safeSeconds > 60) {
    const minutes = Math.ceil(safeSeconds / 60)
    return `${minutes} minute${minutes === 1 ? '' : 's'}`
  }

  // Format as seconds
  return `${safeSeconds} second${safeSeconds === 1 ? '' : 's'}`
}

/**
 * Check if Redis client was successfully configured at initialization
 * Note: This checks configuration status, not runtime connectivity.
 * Runtime failures are handled gracefully by automatic fallback to in-memory storage.
 */
export function isRedisConfigured(): boolean {
  return redis !== null
}
