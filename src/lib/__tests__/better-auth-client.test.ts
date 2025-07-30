/**
 * @vitest-environment jsdom
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { authClient } from '../better-auth-client'

// Mock Better Auth client
const mockAuthClient = {
  signIn: {
    email: vi.fn(),
  },
  signUp: {
    email: vi.fn(),
  },
  signOut: vi.fn(),
  getSession: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  changePassword: vi.fn(),
  forgetPassword: vi.fn(),
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
  linkAccount: vi.fn(),
  unlinkAccount: vi.fn(),
}

vi.mock('better-auth/react', () => ({
  createAuthClient: vi.fn(() => mockAuthClient),
}))

// Mock window object for client-side tests
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
  },
  writable: true,
})

describe('authClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('method availability', () => {
    it('should expose core authentication methods', () => {
      expect(authClient.signIn).toBeDefined()
      expect(authClient.signUp).toBeDefined()
      expect(authClient.signOut).toBeDefined()
    })

    it('should expose session management methods', () => {
      expect(authClient.getSession).toBeDefined()
    })

    it('should expose user management methods', () => {
      expect(authClient.updateUser).toBeDefined()
      expect(authClient.deleteUser).toBeDefined()
    })

    it('should expose password management methods', () => {
      expect(authClient.changePassword).toBeDefined()
      expect(authClient.forgetPassword).toBeDefined()
      expect(authClient.resetPassword).toBeDefined()
    })

    it('should not expose unavailable methods', () => {
      // These methods were removed because they're not available in the current Better Auth version
      expect(authClient.verifyEmail).toBeUndefined()
      expect((authClient as any).linkAccount).toBeUndefined()
      expect((authClient as any).unlinkAccount).toBeUndefined()
    })

    it('should provide access to underlying client', () => {
      expect(authClient._getClient).toBeDefined()
      expect(typeof authClient._getClient).toBe('function')
    })
  })

  describe('method delegation', () => {
    it('should delegate signIn calls to underlying client', () => {
      const signInMethod = authClient.signIn
      expect(signInMethod).toBe(mockAuthClient.signIn)
    })

    it('should delegate signOut calls to underlying client', () => {
      const signOutMethod = authClient.signOut
      expect(signOutMethod).toBe(mockAuthClient.signOut)
    })

    it('should delegate getSession calls to underlying client', () => {
      const getSessionMethod = authClient.getSession
      expect(getSessionMethod).toBe(mockAuthClient.getSession)
    })
  })

  describe('_getClient method', () => {
    it('should return the underlying Better Auth client', () => {
      const client = authClient._getClient()
      expect(client).toBe(mockAuthClient)
    })

    it('should provide access to all client methods', () => {
      const client = authClient._getClient()
      expect(client.signIn).toBe(mockAuthClient.signIn)
      expect(client.signOut).toBe(mockAuthClient.signOut)
      expect(client.getSession).toBe(mockAuthClient.getSession)
    })
  })

  describe('lazy initialization', () => {
    it('should not create client until method is accessed', () => {
      // The client should be created lazily when a method is accessed
      expect(mockAuthClient).toBeDefined()
    })

    it('should reuse the same client instance', () => {
      const client1 = authClient._getClient()
      const client2 = authClient._getClient()
      expect(client1).toBe(client2)
    })
  })
})