import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Note: @testing-library/jest-dom/vitest automatically extends Vitest's expect with jest-dom matchers

/**
 * Global mock for @/lib/api-client
 *
 * This mock MUST be in the global setup file to ensure it's registered before
 * any module imports occur. This is critical because the workout atoms use
 * dynamic imports (`await import('@/lib/api-client')`), and vi.mock() in
 * individual test files may not be hoisted early enough to intercept these
 * dynamic imports in CI environments (jsdom).
 *
 * Test files can access and configure the mock via:
 *   import { api } from '@/lib/api-client'
 *   vi.mocked(api.get).mockResolvedValue(...)
 *
 * Or by re-declaring the mock in the test file (which will merge with this one).
 */
vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
  getApiErrorMessage: vi.fn((error: unknown, fallback = 'An error occurred') => {
    if (error instanceof Error) return error.message
    return fallback
  }),
  DISABLE_ERROR_TOASTS: true,
}))

/**
 * Global mock for @/lib/logger
 *
 * Prevents log output during tests and provides mock functions for assertions.
 */
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

/**
 * NOTE: @/lib/better-auth-client is NOT mocked globally because:
 * 1. The better-auth-client.test.ts file tests the actual implementation
 * 2. Test files that need the mock can define it locally with vi.mock()
 * 3. Unlike api-client, better-auth-client doesn't have dynamic import issues
 */

// Clean up after each test
afterEach(() => {
  cleanup()
})
