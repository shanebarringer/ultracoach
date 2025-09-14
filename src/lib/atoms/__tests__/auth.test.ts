/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Auth Atoms Unit Tests
 *
 * Tests the authentication-related atoms:
 * - sessionAtom
 * - isAuthenticatedAtom
 * - userRoleAtom
 * - isCoachAtom
 * - isRunnerAtom
 */
import { createStore } from 'jotai'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  isAuthenticatedAtom,
  isCoachAtom,
  isRunnerAtom,
  sessionAtom,
  userRoleAtom,
} from '@/lib/atoms/auth'

import {
  createMockSession,
  createTestStore,
  getAtomValue,
  setAtomValue,
  setupCommonMocks,
} from './utils/test-helpers'

describe('Auth Atoms', () => {
  let store: ReturnType<typeof createStore>
  let cleanup: () => void

  beforeEach(() => {
    const mocks = setupCommonMocks()
    cleanup = mocks.cleanup
    store = createTestStore()
  })

  afterEach(() => {
    cleanup()
  })

  describe('sessionAtom', () => {
    it('should have null as initial value', () => {
      const session = getAtomValue(store, sessionAtom)
      expect(session).toBeNull()
    })

    it('should store session data', () => {
      const mockSession = createMockSession()
      setAtomValue(store, sessionAtom, mockSession)

      const session = getAtomValue(store, sessionAtom)
      expect(session).toEqual(mockSession)
      expect(session?.user.email).toBe('test@example.com')
    })

    it('should handle session with coach role', () => {
      const coachSession = createMockSession({
        user: { userType: 'coach', email: 'coach@example.com' },
      })
      setAtomValue(store, sessionAtom, coachSession)

      const session = getAtomValue(store, sessionAtom) as any
      expect(session?.user.userType).toBe('coach')
    })

    it('should handle session with runner role', () => {
      const runnerSession = createMockSession({
        user: { userType: 'runner', email: 'runner@example.com' },
      })
      setAtomValue(store, sessionAtom, runnerSession)

      const session = getAtomValue(store, sessionAtom) as any
      expect(session?.user.userType).toBe('runner')
    })
  })

  describe('isAuthenticatedAtom', () => {
    it('should return false when session is null', () => {
      setAtomValue(store, sessionAtom, null)
      const isAuthenticated = getAtomValue(store, isAuthenticatedAtom)
      expect(isAuthenticated).toBe(false)
    })

    it('should return true when session exists', () => {
      const mockSession = createMockSession()
      setAtomValue(store, sessionAtom, mockSession)

      const isAuthenticated = getAtomValue(store, isAuthenticatedAtom)
      expect(isAuthenticated).toBe(true)
    })

    it('should update when session changes', () => {
      // Initially not authenticated
      setAtomValue(store, sessionAtom, null)
      expect(getAtomValue(store, isAuthenticatedAtom)).toBe(false)

      // Set session
      const mockSession = createMockSession()
      setAtomValue(store, sessionAtom, mockSession)
      expect(getAtomValue(store, isAuthenticatedAtom)).toBe(true)

      // Clear session
      setAtomValue(store, sessionAtom, null)
      expect(getAtomValue(store, isAuthenticatedAtom)).toBe(false)
    })
  })

  describe('userRoleAtom', () => {
    it('should return null when session is null', () => {
      setAtomValue(store, sessionAtom, null)
      const userRole = getAtomValue(store, userRoleAtom)
      expect(userRole).toBeNull()
    })

    it('should return runner role from session', () => {
      const runnerSession = createMockSession({
        user: { userType: 'runner' },
      })
      setAtomValue(store, sessionAtom, runnerSession)

      const userRole = getAtomValue(store, userRoleAtom)
      expect(userRole).toBe('runner')
    })

    it('should return coach role from session', () => {
      const coachSession = createMockSession({
        user: { userType: 'coach' },
      })
      setAtomValue(store, sessionAtom, coachSession)

      const userRole = getAtomValue(store, userRoleAtom)
      expect(userRole).toBe('coach')
    })

    it('should default to runner if userType is missing', () => {
      const sessionWithoutType = createMockSession()
      // Remove userType to test default behavior
      delete sessionWithoutType.user.userType
      setAtomValue(store, sessionAtom, sessionWithoutType)

      const userRole = getAtomValue(store, userRoleAtom)
      expect(userRole).toBe('runner')
    })
  })

  describe('isCoachAtom', () => {
    it('should return false when session is null', () => {
      setAtomValue(store, sessionAtom, null)
      const isCoach = getAtomValue(store, isCoachAtom)
      expect(isCoach).toBe(false)
    })

    it('should return true for coach role', () => {
      const coachSession = createMockSession({
        user: { userType: 'coach' },
      })
      setAtomValue(store, sessionAtom, coachSession)

      const isCoach = getAtomValue(store, isCoachAtom)
      expect(isCoach).toBe(true)
    })

    it('should return false for runner role', () => {
      const runnerSession = createMockSession({
        user: { userType: 'runner' },
      })
      setAtomValue(store, sessionAtom, runnerSession)

      const isCoach = getAtomValue(store, isCoachAtom)
      expect(isCoach).toBe(false)
    })
  })

  describe('isRunnerAtom', () => {
    it('should return false when session is null', () => {
      setAtomValue(store, sessionAtom, null)
      const isRunner = getAtomValue(store, isRunnerAtom)
      expect(isRunner).toBe(false)
    })

    it('should return true for runner role', () => {
      const runnerSession = createMockSession({
        user: { userType: 'runner' },
      })
      setAtomValue(store, sessionAtom, runnerSession)

      const isRunner = getAtomValue(store, isRunnerAtom)
      expect(isRunner).toBe(true)
    })

    it('should return false for coach role', () => {
      const coachSession = createMockSession({
        user: { userType: 'coach' },
      })
      setAtomValue(store, sessionAtom, coachSession)

      const isRunner = getAtomValue(store, isRunnerAtom)
      expect(isRunner).toBe(false)
    })

    it('should return true when userType is missing (defaults to runner)', () => {
      const sessionWithoutType = createMockSession()
      delete sessionWithoutType.user.userType
      setAtomValue(store, sessionAtom, sessionWithoutType)

      const isRunner = getAtomValue(store, isRunnerAtom)
      expect(isRunner).toBe(true)
    })
  })

  describe('Auth atom interactions', () => {
    it('should maintain consistency between related atoms', () => {
      // Test with coach session
      const coachSession = createMockSession({
        user: { userType: 'coach', name: 'Coach Smith' },
      })
      setAtomValue(store, sessionAtom, coachSession)

      expect(getAtomValue(store, isAuthenticatedAtom)).toBe(true)
      expect(getAtomValue(store, userRoleAtom)).toBe('coach')
      expect(getAtomValue(store, isCoachAtom)).toBe(true)
      expect(getAtomValue(store, isRunnerAtom)).toBe(false)

      // Switch to runner session
      const runnerSession = createMockSession({
        user: { userType: 'runner', name: 'Runner Jones' },
      })
      setAtomValue(store, sessionAtom, runnerSession)

      expect(getAtomValue(store, isAuthenticatedAtom)).toBe(true)
      expect(getAtomValue(store, userRoleAtom)).toBe('runner')
      expect(getAtomValue(store, isCoachAtom)).toBe(false)
      expect(getAtomValue(store, isRunnerAtom)).toBe(true)

      // Clear session
      setAtomValue(store, sessionAtom, null)

      expect(getAtomValue(store, isAuthenticatedAtom)).toBe(false)
      expect(getAtomValue(store, userRoleAtom)).toBeNull()
      expect(getAtomValue(store, isCoachAtom)).toBe(false)
      expect(getAtomValue(store, isRunnerAtom)).toBe(false)
    })

    it('should handle session updates correctly', () => {
      const values: boolean[] = []
      const unsubscribe = store.sub(isAuthenticatedAtom, () => {
        values.push(getAtomValue(store, isAuthenticatedAtom))
      })

      // Initial state
      values.push(getAtomValue(store, isAuthenticatedAtom))
      expect(values).toEqual([false])

      // Set session
      setAtomValue(store, sessionAtom, createMockSession())
      expect(values).toEqual([false, true])

      // Note: Updating session with same auth status doesn't trigger subscription
      // because isAuthenticatedAtom is a derived atom that only changes when
      // the boolean value changes (true remains true)
      setAtomValue(
        store,
        sessionAtom,
        createMockSession({
          user: { name: 'Updated User' },
        })
      )
      // Still only two values because isAuthenticated didn't change (still true)
      expect(values).toEqual([false, true])

      // Clear session
      setAtomValue(store, sessionAtom, null)
      expect(values).toEqual([false, true, false])

      unsubscribe()
    })
  })
})
