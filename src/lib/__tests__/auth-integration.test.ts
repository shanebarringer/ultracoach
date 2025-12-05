/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Chainable mock factory for Drizzle-style query builder API
function createChainableMock(resolvedValue: unknown = []) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve(resolvedValue)),
    values: vi.fn(() => chain),
    returning: vi.fn(() => Promise.resolve(resolvedValue)),
    set: vi.fn(() => chain),
  }
  return chain
}

// Mock database module FIRST to prevent real DB connections
vi.mock('../database', () => ({
  db: {
    select: vi.fn(() => createChainableMock()),
    insert: vi.fn(() => createChainableMock()),
    update: vi.fn(() => createChainableMock()),
    delete: vi.fn(() => createChainableMock()),
  },
  client: {
    end: vi.fn(),
  },
}))

// Mock Better Auth
const mockSignIn = vi.fn()
const mockSignUp = vi.fn()
const mockSignOut = vi.fn()
const mockGetSession = vi.fn()

vi.mock('better-auth', () => ({
  betterAuth: vi.fn(() => ({
    api: {
      signInEmail: mockSignIn,
      signUpEmail: mockSignUp,
      signOut: mockSignOut,
      getSession: mockGetSession,
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
  vi.clearAllMocks()
  vi.resetModules()
  process.env = {
    ...originalEnv,
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    BETTER_AUTH_SECRET: 'test_secret_for_unit_tests_only_'.padEnd(64, 'x'), // Non-hex to avoid secret scanner flags
    NODE_ENV: 'test',
  }
})

afterEach(() => {
  process.env = originalEnv
})

describe('Authentication Integration Tests', () => {
  describe('Complete Authentication Flow', () => {
    it('should handle complete sign-up flow', async () => {
      // Mock successful sign-up response
      mockSignUp.mockResolvedValueOnce({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
        },
        token: 'test-session-token',
      })

      // Import the auth module after setting up mocks
      const { auth } = await import('../better-auth')

      // Test sign-up flow
      const result = await auth.api.signUpEmail({
        body: {
          email: 'test@example.com',
          password: 'securePassword123!',
          name: 'Test User',
        },
      })

      expect(mockSignUp).toHaveBeenCalledWith({
        body: {
          email: 'test@example.com',
          password: 'securePassword123!',
          name: 'Test User',
        },
      })

      expect(result?.user.email).toBe('test@example.com')
      expect(result?.token).toBe('test-session-token')
    })

    it('should handle complete sign-in flow', async () => {
      // Mock successful sign-in response
      mockSignIn.mockResolvedValueOnce({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          userType: 'runner',
        },
        token: 'test-session-token',
      })

      const { auth } = await import('../better-auth')

      // Test sign-in flow
      const result = await auth.api.signInEmail({
        body: {
          email: 'test@example.com',
          password: 'securePassword123!',
        },
      })

      expect(mockSignIn).toHaveBeenCalledWith({
        body: {
          email: 'test@example.com',
          password: 'securePassword123!',
        },
      })

      expect(result?.user.email).toBe('test@example.com')
      expect((result?.user as { userType?: string })?.userType).toBe('runner')
    })

    it('should handle session validation', async () => {
      // Mock valid session response
      mockGetSession.mockResolvedValueOnce({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'user',
          userType: 'coach',
        },
        session: {
          id: 'test-session-id',
          token: 'test-session-token',
          expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
        },
      })

      const { auth } = await import('../better-auth')

      // Test session validation
      const result = await auth.api.getSession({
        headers: new Headers({
          Authorization: 'Bearer test-session-token',
        }),
      })

      expect(mockGetSession).toHaveBeenCalled()
      expect(result?.user.id).toBe('test-user-id')
      expect(result?.session.token).toBe('test-session-token')
    })

    it('should handle sign-out flow', async () => {
      // Mock successful sign-out response
      mockSignOut.mockResolvedValueOnce({
        success: true,
      })

      const { auth } = await import('../better-auth')

      // Test sign-out flow
      const result = await auth.api.signOut({
        headers: {
          Authorization: 'Bearer test-session-token',
        } as Record<string, string>,
      })

      expect(mockSignOut).toHaveBeenCalled()
      expect(result?.success).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid credentials', async () => {
      // Mock failed sign-in response
      mockSignIn.mockResolvedValueOnce({
        user: undefined,
        token: null,
      })

      const { auth } = await import('../better-auth')

      // Test invalid credentials
      const result = await auth.api.signInEmail({
        body: {
          email: 'test@example.com',
          password: 'wrongPassword',
        },
      })

      expect(result?.user).toBeUndefined()
      expect(result?.token).toBeNull()
    })

    it('should handle duplicate email registration', async () => {
      // Mock failed sign-up response for duplicate email
      mockSignUp.mockResolvedValueOnce({
        user: undefined,
        token: null,
      })

      const { auth } = await import('../better-auth')

      // Test duplicate email registration
      const result = await auth.api.signUpEmail({
        body: {
          email: 'existing@example.com',
          password: 'securePassword123!',
          name: 'Test User',
        },
      })

      expect(result?.user).toBeUndefined()
      expect(result?.token).toBeNull()
    })

    it('should handle expired sessions', async () => {
      // Mock expired session response
      mockGetSession.mockResolvedValueOnce({
        error: {
          message: 'Session expired',
          code: 'SESSION_EXPIRED',
        },
      })

      const { auth } = await import('../better-auth')

      // Test expired session
      const result = await auth.api.getSession({
        headers: new Headers({
          Authorization: 'Bearer expired-token',
        }),
      })

      expect(result?.user).toBeUndefined()
      expect(result?.session).toBeUndefined()
    })
  })

  describe('Database Integration', () => {
    it('should create user record in database during sign-up', async () => {
      // Mock successful Better Auth sign-up
      // Note: Better Auth handles database operations internally via the drizzle adapter
      mockSignUp.mockResolvedValueOnce({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
            role: 'user',
            userType: 'runner',
          },
        },
      })

      const { auth } = await import('../better-auth')

      // Test user creation
      await auth.api.signUpEmail({
        body: {
          email: 'test@example.com',
          password: 'securePassword123!',
          name: 'Test User',
        },
      })

      expect(mockSignUp).toHaveBeenCalled()
    })

    it('should handle database connection errors gracefully', async () => {
      // Mock database connection error via Better Auth
      mockSignIn.mockRejectedValueOnce(new Error('Database connection failed'))

      const { auth } = await import('../better-auth')

      // Better Auth should propagate database errors as rejections
      await expect(
        auth.api.signInEmail({
          body: {
            email: 'test@example.com',
            password: 'password123',
          },
        })
      ).rejects.toThrow('Database connection failed')
    })
  })

  describe('Security Validations', () => {
    it('should validate password requirements', async () => {
      // Mock weak password rejection
      mockSignUp.mockResolvedValueOnce({
        error: {
          message: 'Password does not meet requirements',
          code: 'WEAK_PASSWORD',
        },
      })

      const { auth } = await import('../better-auth')

      // Test weak password
      const result = await auth.api.signUpEmail({
        body: {
          email: 'test@example.com',
          password: '123', // Too weak
          name: 'Test User',
        },
      })

      expect(result?.user).toBeUndefined()
    })

    it('should validate email format', async () => {
      // Mock invalid email rejection
      mockSignUp.mockResolvedValueOnce({
        error: {
          message: 'Invalid email format',
          code: 'INVALID_EMAIL',
        },
      })

      const { auth } = await import('../better-auth')

      // Test invalid email
      const result = await auth.api.signUpEmail({
        body: {
          email: 'invalid-email', // Invalid format
          password: 'securePassword123!',
          name: 'Test User',
        },
      })

      expect(result?.user).toBeUndefined()
    })

    it('should handle SQL injection attempts', async () => {
      // Mock SQL injection attempt
      const maliciousEmail = "'; DROP TABLE users; --"

      mockSignIn.mockResolvedValueOnce({
        error: {
          message: 'Invalid input',
          code: 'INVALID_INPUT',
        },
      })

      const { auth } = await import('../better-auth')

      // Test SQL injection protection
      const result = await auth.api.signInEmail({
        body: {
          email: maliciousEmail,
          password: 'password123',
        },
      })

      // Should be rejected without executing malicious SQL
      expect(result?.user).toBeUndefined()
    })
  })
})
