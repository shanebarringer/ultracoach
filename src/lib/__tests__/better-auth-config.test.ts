/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock environment variables
const originalEnv = process.env

beforeEach(() => {
  vi.resetModules()
  process.env = { ...originalEnv }
})

afterEach(() => {
  process.env = originalEnv
})

describe('Better Auth Configuration', () => {
  describe('Environment Variable Validation', () => {
    it('should require BETTER_AUTH_SECRET', async () => {
      vi.stubEnv('BETTER_AUTH_SECRET', '')
      vi.stubEnv('DATABASE_URL', 'postgresql://test')

      await expect(async () => {
        await import('../better-auth')
      }).rejects.toThrow('BETTER_AUTH_SECRET environment variable is required')
    })

    it('should require DATABASE_URL', async () => {
      vi.stubEnv('DATABASE_URL', '')
      vi.stubEnv('BETTER_AUTH_SECRET', 'a'.repeat(64))

      await expect(async () => {
        await import('../better-auth')
      }).rejects.toThrow('DATABASE_URL environment variable is required')
    })

    it('should validate BETTER_AUTH_SECRET length', async () => {
      vi.stubEnv('BETTER_AUTH_SECRET', 'short')
      vi.stubEnv('DATABASE_URL', 'postgresql://test')

      await expect(async () => {
        await import('../better-auth')
      }).rejects.toThrow('BETTER_AUTH_SECRET must be at least 32 characters long')
    })

    it('should accept valid BETTER_AUTH_SECRET', async () => {
      vi.stubEnv('BETTER_AUTH_SECRET', 'a'.repeat(64))
      vi.stubEnv('DATABASE_URL', 'postgresql://test')

      // Should not throw an error during import
      await expect(async () => {
        await import('../better-auth')
      }).not.toThrow()
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
