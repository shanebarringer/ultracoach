import { createLogger } from '@/lib/logger'

const logger = createLogger('RateLimiter')

// In-memory rate limiter (for production, consider Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  max: number // Maximum requests per window
  keyGenerator?: (identifier: string) => string // Custom key generation
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

/**
 * Simple in-memory rate limiter for API endpoints
 * For production with multiple instances, consider Redis-based limiter
 */
export class RateLimiter {
  private windowMs: number
  private max: number
  private keyGenerator: (identifier: string) => string

  constructor(options: RateLimitOptions) {
    this.windowMs = options.windowMs
    this.max = options.max
    this.keyGenerator = options.keyGenerator || ((id: string) => id)
  }

  /**
   * Check if request is allowed for given identifier
   */
  check(identifier: string): RateLimitResult {
    const key = this.keyGenerator(identifier)
    const now = Date.now()
    const windowStart = now - this.windowMs

    // Clean up expired entries
    this.cleanup(windowStart)

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key)
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
      logger.warn('Rate limit exceeded', {
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
    rateLimitStore.set(key, entry)

    logger.info('Rate limit check passed', {
      key,
      count: entry.count,
      max: this.max,
      remaining: this.max - entry.count,
    })

    return {
      allowed: true,
      remaining: this.max - entry.count,
      resetTime: entry.resetTime,
    }
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanup(windowStart: number): void {
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime <= windowStart) {
        rateLimitStore.delete(key)
      }
    }
  }

  /**
   * Reset rate limit for specific identifier (admin function)
   */
  reset(identifier: string): void {
    const key = this.keyGenerator(identifier)
    rateLimitStore.delete(key)
    logger.info('Rate limit reset', { key })
  }

  /**
   * Get current statistics for identifier
   */
  getStats(identifier: string): { count: number; remaining: number; resetTime: number } | null {
    const key = this.keyGenerator(identifier)
    const entry = rateLimitStore.get(key)

    if (!entry) {
      return null
    }

    return {
      count: entry.count,
      remaining: Math.max(0, this.max - entry.count),
      resetTime: entry.resetTime,
    }
  }
}

// Pre-configured rate limiters for different operations
export const raceImportLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 imports per 15 minutes per user
  keyGenerator: (userId: string) => `race_import:${userId}`,
})

export const raceBulkImportLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 2, // 2 bulk imports per hour per user
  keyGenerator: (userId: string) => `race_bulk_import:${userId}`,
})

// General API rate limiter
export const apiLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per user
  keyGenerator: (userId: string) => `api:${userId}`,
})

/**
 * Utility function to add rate limit headers to response
 */
export function addRateLimitHeaders(response: Response, result: RateLimitResult): Response {
  const headers = new Headers(response.headers)

  headers.set('X-RateLimit-Limit', String(result.remaining + (result.allowed ? 1 : 0)))
  headers.set('X-RateLimit-Remaining', String(result.remaining))
  headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)))

  if (result.retryAfter) {
    headers.set('Retry-After', String(result.retryAfter))
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * Exponential backoff utility for retry logic
 */
export function calculateBackoff(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay
  return Math.floor(delay + jitter)
}

/**
 * Generic retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  shouldRetry?: (error: unknown) => boolean
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry on final attempt
      if (attempt === maxRetries) {
        break
      }

      // Check if we should retry this error
      if (shouldRetry && !shouldRetry(error)) {
        break
      }

      // Wait before retrying
      const delay = calculateBackoff(attempt, baseDelay)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}
