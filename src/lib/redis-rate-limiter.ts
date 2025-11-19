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

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter: number // Always present - 0 when allowed, positive when rate limited
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
    const windowStart = now - this.windowMs

    // Use Redis if available
    if (redis) {
      return this.checkRedis(key, now)
    }

    // Fallback to in-memory rate limiting
    return this.checkMemory(key, now, windowStart)
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
      // Note: TTL can return -2 (key doesn't exist) or -1 (no expiration)
      const ttl = await redis!.ttl(key)

      // Defensive handling: If TTL is invalid, use full window duration
      const safeTTL = ttl > 0 ? ttl : Math.ceil(this.windowMs / 1000)
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
      }
    } catch (error) {
      logger.error('Redis rate limiting failed, falling back to memory:', error)
      // Fallback to in-memory if Redis fails
      const windowStart = now - this.windowMs
      return this.checkMemory(key, now, windowStart)
    }
  }

  /**
   * In-memory rate limiting (fallback, single-instance only)
   */
  private checkMemory(key: string, now: number, windowStart: number): RateLimitResult {
    // Periodic cleanup to avoid O(n) overhead on every request
    // Only cleanup if enough time has passed since last cleanup
    if (now - this.lastCleanup > this.cleanupInterval) {
      this.cleanupMemory(windowStart)
      this.lastCleanup = now
    }

    // Get or create rate limit entry
    let entry = this.memoryStore.get(key)
    if (!entry || entry.resetTime <= windowStart) {
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
    }
  }

  /**
   * Clean up expired rate limit entries from memory
   */
  private cleanupMemory(windowStart: number): void {
    for (const [key, entry] of this.memoryStore.entries()) {
      if (entry.resetTime <= windowStart) {
        this.memoryStore.delete(key)
      }
    }
  }

  /**
   * Reset rate limit for specific identifier (admin function)
   */
  async reset(identifier: string): Promise<void> {
    const key = `ratelimit:${this.keyGenerator(identifier)}`

    if (redis) {
      try {
        await redis.del(key)
        logger.info('Rate limit reset (Redis)', { key })
      } catch (error) {
        logger.error('Failed to reset rate limit in Redis:', error)
      }
    } else {
      this.memoryStore.delete(key)
      logger.info('Rate limit reset (memory)', { key })
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
        if (!count) return null

        const ttl = await redis.ttl(key)
        const resetTime = Date.now() + ttl * 1000

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
  // Calculate the limit value (total allowed requests in window)
  const limit = result.remaining + (result.allowed ? 1 : 0)

  // Mutate headers directly on the NextResponse object
  response.headers.set('X-RateLimit-Limit', String(limit))
  response.headers.set('X-RateLimit-Remaining', String(result.remaining))
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)))

  if (result.retryAfter > 0) {
    response.headers.set('Retry-After', String(result.retryAfter))
  }

  return response
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redis !== null
}
