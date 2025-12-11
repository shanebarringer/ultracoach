import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Note: @testing-library/jest-dom/vitest automatically extends Vitest's expect with jest-dom matchers

// Mock logger at the setup level to prevent module initialization errors
vi.mock('@/lib/logger', () => {
  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  }

  return {
    createLogger: vi.fn(() => mockLogger),
    default: mockLogger,
    log: mockLogger.info,
    debug: mockLogger.debug,
    info: mockLogger.info,
    warn: mockLogger.warn,
    error: mockLogger.error,
    fatal: mockLogger.fatal,
  }
})

// Mock server-only to prevent client component error in tests
vi.mock('server-only', () => ({}))

// Mock Supabase admin client globally to prevent initialization errors
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/avatars/test.jpg' },
        }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        list: vi.fn().mockResolvedValue({ data: [] }),
      })),
    },
  },
}))

// Mock Redis rate limiter module functions
vi.mock('@/lib/redis-rate-limiter', () => ({
  RedisRateLimiter: vi.fn().mockImplementation(() => ({
    check: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetTime: Date.now() + 60000,
      retryAfter: 0,
      limit: 10,
    }),
    reset: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({
      count: 1,
      remaining: 9,
      resetTime: Date.now() + 60000,
    }),
  })),
  addRateLimitHeaders: vi.fn(response => response),
  formatRetryAfter: vi.fn(
    seconds => `in ${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) !== 1 ? 's' : ''}`
  ),
  // Mock the pre-configured rate limiters
  raceImportLimiter: {
    check: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetTime: Date.now() + 900000,
      retryAfter: 0,
      limit: 5,
    }),
    reset: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({
      count: 1,
      remaining: 4,
      resetTime: Date.now() + 900000,
    }),
  },
  raceBulkImportLimiter: {
    check: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 1,
      resetTime: Date.now() + 3600000,
      retryAfter: 0,
      limit: 2,
    }),
    reset: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({
      count: 1,
      remaining: 1,
      resetTime: Date.now() + 3600000,
    }),
  },
  apiLimiter: {
    check: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetTime: Date.now() + 60000,
      retryAfter: 0,
      limit: 100,
    }),
    reset: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({
      count: 1,
      remaining: 99,
      resetTime: Date.now() + 60000,
    }),
  },
  feedbackLimiter: {
    check: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetTime: Date.now() + 3600000,
      retryAfter: 0,
      limit: 10,
    }),
    reset: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({
      count: 1,
      remaining: 9,
      resetTime: Date.now() + 3600000,
    }),
  },
  messageLimiter: {
    check: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetTime: Date.now() + 60000,
      retryAfter: 0,
      limit: 30,
    }),
    reset: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({
      count: 1,
      remaining: 29,
      resetTime: Date.now() + 60000,
    }),
  },
  isRedisConfigured: vi.fn().mockReturnValue(false),
}))

// Mock postgres client to prevent connection attempts in tests
vi.mock('postgres', () => {
  const mockClient = {
    end: vi.fn(),
    query: vi.fn().mockResolvedValue({ rows: [] }),
  }
  return {
    default: vi.fn(() => mockClient),
    __esModule: true,
  }
})

// Mock drizzle ORM
vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])), // Empty result by default
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve([])),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
  })),
}))

// Mock database module (needs to come after drizzle mock)
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])), // Empty result by default
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve([])),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
  },
  client: {
    end: vi.fn(),
    query: vi.fn().mockResolvedValue({ rows: [] }),
  },
}))

// Mock Upstash Redis to prevent connection attempts in tests
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(3600),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
  })),
}))

// Clean up after each test
afterEach(() => {
  cleanup()
})
