import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBetterAuth } from '../useBetterAuth'

// Mock the auth client
vi.mock('@/lib/better-auth-client', () => ({
  authClient: {
    getSession: vi.fn(),
    signIn: {
      email: vi.fn(),
    },
    signUp: {
      email: vi.fn(),
    },
    signOut: vi.fn(),
  }
}))

const mockAuthClient = await import('@/lib/better-auth-client')

describe('useBetterAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to default behavior - return null session
    vi.mocked(mockAuthClient.authClient.getSession).mockResolvedValue({
      data: null,
      error: null
    })
  })

  it('should initialize with loading state', async () => {
    vi.mocked(mockAuthClient.authClient.getSession).mockResolvedValue({
      data: null,
      error: null
    })

    const { result } = renderHook(() => useBetterAuth())
    
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBe(null)
    expect(result.current.session).toBe(null)
    expect(result.current.error).toBe(null)

    // Wait for the async effect to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
  })

  it('should handle successful session retrieval', async () => {
    const mockSession = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'runner' as const,
        full_name: 'Test User'
      },
      token: 'session-token'
    }

    vi.mocked(mockAuthClient.authClient.getSession).mockResolvedValue({
      data: mockSession,
      error: null
    })

    const { result } = renderHook(() => useBetterAuth())

    // Wait for the async effect to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.user).toEqual(mockSession.user)
    expect(result.current.session).toEqual(mockSession)
    expect(result.current.error).toBe(null)
  })

  it('should handle session retrieval error', async () => {
    const mockError = { message: 'Session expired' }

    vi.mocked(mockAuthClient.authClient.getSession).mockResolvedValue({
      data: null,
      error: mockError
    })

    const { result } = renderHook(() => useBetterAuth())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.user).toBe(null)
    expect(result.current.session).toBe(null)
    expect(result.current.error).toBe('Session expired')
  })

  it('should handle successful sign in', async () => {
    const mockSignInData = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'runner' as const,
        full_name: 'Test User'
      }
    }

    const mockSessionData = {
      user: mockSignInData.user,
      token: 'session-token'
    }

    // Initial getSession call returns null
    vi.mocked(mockAuthClient.authClient.getSession)
      .mockResolvedValueOnce({
        data: null,
        error: null
      })
      // Second getSession call after sign in returns session
      .mockResolvedValueOnce({
        data: mockSessionData,
        error: null
      })

    vi.mocked(mockAuthClient.authClient.signIn.email).mockResolvedValue({
      data: mockSignInData,
      error: null
    })

    const { result } = renderHook(() => useBetterAuth())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    let signInResult: { success: boolean; error?: string }
    await act(async () => {
      signInResult = await result.current.signIn('test@example.com', 'password123')
    })

    expect(signInResult.success).toBe(true)
    expect(result.current.user).toEqual(mockSignInData.user)
    expect(result.current.session).toEqual(mockSessionData)
    expect(result.current.error).toBe(null)
    expect(result.current.loading).toBe(false)
  })

  it('should handle sign in error', async () => {
    const mockError = { message: 'Invalid credentials' }

    vi.mocked(mockAuthClient.authClient.getSession).mockResolvedValue({
      data: null,
      error: null
    })

    vi.mocked(mockAuthClient.authClient.signIn.email).mockResolvedValue({
      data: null,
      error: mockError
    })

    const { result } = renderHook(() => useBetterAuth())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    let signInResult: { success: boolean; error?: string }
    await act(async () => {
      signInResult = await result.current.signIn('test@example.com', 'wrong-password')
    })

    expect(signInResult.success).toBe(false)
    expect(signInResult.error).toBe('Invalid credentials')
    expect(result.current.user).toBe(null)
    expect(result.current.session).toBe(null)
    expect(result.current.error).toBe('Invalid credentials')
    expect(result.current.loading).toBe(false)
  })

  it('should handle successful sign up', async () => {
    const mockSignUpData = {
      user: {
        id: 'new-user-id',
        email: 'new@example.com',
        role: 'runner' as const,
        full_name: 'New User'
      }
    }

    const mockSessionData = {
      user: mockSignUpData.user,
      token: 'new-session-token'
    }

    // Initial getSession call returns null
    vi.mocked(mockAuthClient.authClient.getSession)
      .mockResolvedValueOnce({
        data: null,
        error: null
      })
      // Second getSession call after sign up returns session
      .mockResolvedValueOnce({
        data: mockSessionData,
        error: null
      })

    vi.mocked(mockAuthClient.authClient.signUp.email).mockResolvedValue({
      data: mockSignUpData,
      error: null
    })

    const { result } = renderHook(() => useBetterAuth())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    let signUpResult: { success: boolean; error?: string }
    await act(async () => {
      signUpResult = await result.current.signUp('new@example.com', 'password123', 'New User')
    })

    expect(signUpResult.success).toBe(true)
    expect(result.current.user).toEqual(mockSignUpData.user)
    expect(result.current.session).toEqual(mockSessionData)
    expect(result.current.error).toBe(null)
    expect(result.current.loading).toBe(false)
  })

  it('should handle successful sign out', async () => {
    const mockSession = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'runner' as const,
        full_name: 'Test User'
      },
      token: 'session-token'
    }

    vi.mocked(mockAuthClient.authClient.getSession).mockResolvedValue({
      data: mockSession,
      error: null
    })

    vi.mocked(mockAuthClient.authClient.signOut).mockResolvedValue({
      data: null,
      error: null
    })

    const { result } = renderHook(() => useBetterAuth())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    // Verify user is signed in
    expect(result.current.user).toEqual(mockSession.user)

    let signOutResult: { success: boolean; error?: string }
    await act(async () => {
      signOutResult = await result.current.signOut()
    })

    expect(signOutResult.success).toBe(true)
    expect(result.current.user).toBe(null)
    expect(result.current.session).toBe(null)
    expect(result.current.error).toBe(null)
    expect(result.current.loading).toBe(false)
  })

  it('should handle sign out error', async () => {
    const mockError = { message: 'Sign out failed' }

    vi.mocked(mockAuthClient.authClient.getSession).mockResolvedValue({
      data: null,
      error: null
    })

    vi.mocked(mockAuthClient.authClient.signOut).mockResolvedValue({
      data: null,
      error: mockError
    })

    const { result } = renderHook(() => useBetterAuth())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    let signOutResult: { success: boolean; error?: string }
    await act(async () => {
      signOutResult = await result.current.signOut()
    })

    expect(signOutResult.success).toBe(false)
    expect(signOutResult.error).toBe('Sign out failed')
    expect(result.current.error).toBe('Sign out failed')
    expect(result.current.loading).toBe(false)
  })
})