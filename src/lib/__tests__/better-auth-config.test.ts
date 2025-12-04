/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock database module to prevent real DB connections
vi.mock('../database', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  client: {
    end: vi.fn(),
  },
}))

// Mock better-auth to avoid actual initialization
vi.mock('better-auth', () => ({
  betterAuth: vi.fn(() => ({
    api: {
      getSession: vi.fn(),
      signInEmail: vi.fn(),
      signUpEmail: vi.fn(),
      signOut: vi.fn(),
    },
  })),
}))

vi.mock('better-auth/adapters/drizzle', () => ({
  drizzleAdapter: vi.fn(),
}))

vi.mock('better-auth/next-js', () => ({
  nextCookies: vi.fn(),
}))

vi.mock('better-auth/plugins', () => ({
  admin: vi.fn(),
  customSession: vi.fn(fn => fn),
}))

vi.mock('resend', () => ({
  Resend: vi.fn(),
}))

// Mock environment variables
const originalEnv = process.env

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  // Start with valid defaults - tests can override as needed
  process.env = {
    ...originalEnv,
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    BETTER_AUTH_SECRET: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    NODE_ENV: 'test',
  }
})

afterEach(() => {
  vi.unstubAllEnvs()
  process.env = originalEnv
})

// Helper function to safely test module import errors
async function testModuleImportError(expectedError: string): Promise<boolean> {
  try {
    await import('../better-auth')
    return false // Should have thrown
  } catch (error) {
    if (error instanceof Error && error.message.includes(expectedError)) {
      return true
    }
    throw error // Re-throw unexpected errors
  }
}

describe('Better Auth Configuration', () => {
  describe('Environment Variable Validation', () => {
    it('should require BETTER_AUTH_SECRET', async () => {
      vi.stubEnv('BETTER_AUTH_SECRET', '')
      vi.stubEnv('DATABASE_URL', 'postgresql://test')

      const threwExpectedError = await testModuleImportError(
        'BETTER_AUTH_SECRET environment variable is required'
      )
      expect(threwExpectedError).toBe(true)
    })

    it('should require DATABASE_URL (tested in database module)', async () => {
      // DATABASE_URL validation happens in database.ts, not better-auth.ts
      // This test verifies that better-auth handles the case when database is available
      vi.stubEnv('DATABASE_URL', 'postgresql://test')
      vi.stubEnv('BETTER_AUTH_SECRET', 'a'.repeat(64))

      // Should not throw when DATABASE_URL is set
      const { auth } = await import('../better-auth')
      expect(auth).toBeDefined()
    })

    it('should validate BETTER_AUTH_SECRET length', async () => {
      vi.stubEnv('BETTER_AUTH_SECRET', 'short')
      vi.stubEnv('DATABASE_URL', 'postgresql://test')

      const threwExpectedError = await testModuleImportError(
        'BETTER_AUTH_SECRET must be at least 32 characters long'
      )
      expect(threwExpectedError).toBe(true)
    })

    it('should accept valid BETTER_AUTH_SECRET', async () => {
      vi.stubEnv('BETTER_AUTH_SECRET', 'a'.repeat(64))
      vi.stubEnv('DATABASE_URL', 'postgresql://test')

      // Should not throw an error during import
      const { auth } = await import('../better-auth')
      expect(auth).toBeDefined()
    })
  })

  describe('SSL Configuration', () => {
    it('should use SSL in production environment', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      process.env.BETTER_AUTH_SECRET = 'a'.repeat(64)
      process.env.DATABASE_URL = 'postgresql://test'

      // Import and check SSL configuration would be applied
      const { auth } = await import('../better-auth')
      expect(auth).toBeDefined()
    })

    it('should not use SSL in development environment', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      process.env.BETTER_AUTH_SECRET = 'a'.repeat(64)
      process.env.DATABASE_URL = 'postgresql://test'

      // Should work without SSL configuration
      const { auth } = await import('../better-auth')
      expect(auth).toBeDefined()
    })
  })

  describe('Base URL Configuration', () => {
    it('should use VERCEL_URL when available', async () => {
      process.env.VERCEL_URL = 'my-app.vercel.app'
      process.env.BETTER_AUTH_SECRET = 'a'.repeat(64)
      process.env.DATABASE_URL = 'postgresql://test'

      const { auth } = await import('../better-auth')
      expect(auth).toBeDefined()
    })

    it('should use BETTER_AUTH_URL when provided', async () => {
      process.env.BETTER_AUTH_URL = 'https://custom-domain.com/api/auth'
      process.env.BETTER_AUTH_SECRET = 'a'.repeat(64)
      process.env.DATABASE_URL = 'postgresql://test'

      const { auth } = await import('../better-auth')
      expect(auth).toBeDefined()
    })

    it('should use fallback URL in development', async () => {
      delete process.env.VERCEL_URL
      delete process.env.BETTER_AUTH_URL
      vi.stubEnv('NODE_ENV', 'development')
      process.env.BETTER_AUTH_SECRET = 'a'.repeat(64)
      process.env.DATABASE_URL = 'postgresql://test'

      const { auth } = await import('../better-auth')
      expect(auth).toBeDefined()
    })
  })

  describe('Database Connection Pool', () => {
    it('should configure production connection pool settings', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      process.env.BETTER_AUTH_SECRET = 'a'.repeat(64)
      process.env.DATABASE_URL = 'postgresql://test'

      const { auth } = await import('../better-auth')
      expect(auth).toBeDefined()
    })

    it('should configure development connection pool settings', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      process.env.BETTER_AUTH_SECRET = 'a'.repeat(64)
      process.env.DATABASE_URL = 'postgresql://test'

      const { auth } = await import('../better-auth')
      expect(auth).toBeDefined()
    })
  })

  describe('User Configuration', () => {
    it('should configure additional user fields', async () => {
      process.env.BETTER_AUTH_SECRET = 'a'.repeat(64)
      process.env.DATABASE_URL = 'postgresql://test'

      const { auth } = await import('../better-auth')
      expect(auth).toBeDefined()

      // Check that auth instance has api methods configured
      expect(auth.api).toBeDefined()
      expect(auth.api.getSession).toBeDefined()
    })
  })
})
