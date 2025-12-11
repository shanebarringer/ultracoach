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
  RedisRateLimiter: vi.fn(),
  addRateLimitHeaders: vi.fn(response => response),
  formatRetryAfter: vi.fn(
    seconds => `in ${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) !== 1 ? 's' : ''}`
  ),
}))

// Mock database module
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
}))

// Clean up after each test
afterEach(() => {
  cleanup()
})
