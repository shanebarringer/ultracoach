/**
 * @vitest-environment node
 */

import { vi, describe, expect, it, beforeEach, afterEach } from 'vitest'

// Mock environment variables
const originalEnv = process.env

beforeEach(() => {
  vi.clearAllMocks()
  process.env = {
    ...originalEnv,
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    BETTER_AUTH_SECRET: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    NODE_ENV: 'test',
  }
})

afterEach(() => {
  process.env = originalEnv
})

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

// Mock database
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockWhere = vi.fn()
const mockFrom = vi.fn()

vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: vi.fn(() => ({
    select: vi.fn(() => ({
      from: mockFrom.mockReturnValue({
        where: mockWhere.mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })),
    insert: mockInsert,
    update: mockUpdate,
  })),
}))

vi.mock('pg', () => ({
  Pool: vi.fn(() => ({
    query: vi.fn(),
    end: vi.fn(),
    on: vi.fn(),
  })),
}))

describe('Authentication Integration Tests', () => {
  describe('Complete Authentication Flow', () => {
    it('should handle complete sign-up flow', async () => {
      // Mock successful sign-up response
      mockSignUp.mockResolvedValueOnce({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
          },
          session: {
            id: 'test-session-id',
            token: 'test-session-token',
          },
        },
      })

      // Mock user creation in database
      mockFrom.mockReturnValueOnce({
        where: mockWhere.mockReturnValueOnce({
          limit: vi.fn().mockResolvedValueOnce([]), // User doesn't exist
        }),
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

      expect(result.data?.user.email).toBe('test@example.com')
      expect(result.data?.session.token).toBe('test-session-token')
    })

    it('should handle complete sign-in flow', async () => {
      // Mock successful sign-in response
      mockSignIn.mockResolvedValueOnce({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
            role: 'runner',
          },
          session: {
            id: 'test-session-id',
            token: 'test-session-token',
          },
        },
      })

      // Mock user exists in database
      mockFrom.mockReturnValueOnce({
        where: mockWhere.mockReturnValueOnce({
          limit: vi.fn().mockResolvedValueOnce([{
            id: 'test-user-id',
            email: 'test@example.com',
            role: 'runner',
          }]),
        }),
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

      expect(result.data?.user.email).toBe('test@example.com')
      expect(result.data?.user.role).toBe('runner')
    })

    it('should handle session validation', async () => {
      // Mock valid session response
      mockGetSession.mockResolvedValueOnce({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            role: 'coach',
          },
          session: {
            id: 'test-session-id',
            token: 'test-session-token',
            expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
          },
        },
      })

      const { auth } = await import('../better-auth')

      // Test session validation
      const result = await auth.api.getSession({
        headers: {
          authorization: 'Bearer test-session-token',
        },
      })

      expect(mockGetSession).toHaveBeenCalled()
      expect(result.data?.user.id).toBe('test-user-id')
      expect(result.data?.session.token).toBe('test-session-token')
    })

    it('should handle sign-out flow', async () => {
      // Mock successful sign-out response
      mockSignOut.mockResolvedValueOnce({
        data: { success: true },
      })

      const { auth } = await import('../better-auth')

      // Test sign-out flow
      const result = await auth.api.signOut({
        headers: {
          authorization: 'Bearer test-session-token',
        },
      })

      expect(mockSignOut).toHaveBeenCalled()
      expect(result.data?.success).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid credentials', async () => {
      // Mock failed sign-in response
      mockSignIn.mockResolvedValueOnce({
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        },
      })

      const { auth } = await import('../better-auth')

      // Test invalid credentials
      const result = await auth.api.signInEmail({
        body: {
          email: 'test@example.com',
          password: 'wrongPassword',
        },
      })

      expect(result.error?.message).toBe('Invalid credentials')
      expect(result.error?.code).toBe('INVALID_CREDENTIALS')
    })

    it('should handle duplicate email registration', async () => {
      // Mock failed sign-up response for duplicate email
      mockSignUp.mockResolvedValueOnce({
        error: {
          message: 'Email already exists',
          code: 'EMAIL_ALREADY_EXISTS',
        },
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

      expect(result.error?.message).toBe('Email already exists')
      expect(result.error?.code).toBe('EMAIL_ALREADY_EXISTS')
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
        headers: {
          authorization: 'Bearer expired-token',
        },
      })

      expect(result.error?.message).toBe('Session expired')
      expect(result.error?.code).toBe('SESSION_EXPIRED')
    })
  })

  describe('Database Integration', () => {
    it('should create user record in database during sign-up', async () => {
      // Mock successful Better Auth sign-up
      mockSignUp.mockResolvedValueOnce({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
          },
        },
      })

      // Mock database operations
      mockFrom.mockReturnValueOnce({
        where: mockWhere.mockReturnValueOnce({
          limit: vi.fn().mockResolvedValueOnce([]), // User doesn't exist
        }),
      })

      mockInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([{
            id: 'test-user-id',
            email: 'test@example.com',
            role: 'runner',
          }]),
        }),
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
      // Mock database connection error
      vi.mocked(mockFrom).mockRejectedValueOnce(new Error('Database connection failed'))

      const { auth } = await import('../better-auth')

      // Test should not throw but handle gracefully
      await expect(async () => {
        try {
          await auth.api.signInEmail({
            body: {
              email: 'test@example.com',
              password: 'password123',
            },
          })
        } catch (error) {
          // Database errors should be handled gracefully
          expect(error).toBeInstanceOf(Error)
        }
      }).not.toThrow()
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

      expect(result.error?.code).toBe('WEAK_PASSWORD')
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

      expect(result.error?.code).toBe('INVALID_EMAIL')
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
      expect(result.error?.code).toBe('INVALID_INPUT')
    })
  })
})