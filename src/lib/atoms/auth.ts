/**
 * Authentication atoms for Better Auth integration
 *
 * This module manages all authentication-related state including sessions,
 * user data, auth status tracking, and persisted preferences.
 *
 * @module atoms/auth
 */
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { Session, User } from '@/lib/better-auth-client'

// Core auth atoms

/**
 * Current session atom - holds the active Better Auth session
 */
export const sessionAtom = atom<Session | null>(null)

/**
 * Current user atom - holds the authenticated user data
 */
export const userAtom = atom<User | null>(null)

/**
 * Auth loading state - tracks authentication initialization
 * Set to false initially to show UI immediately for unauthenticated users
 */
export const authLoadingAtom = atom(false)

// Auth state atoms
export const authErrorAtom = atom<string | null>(null)
export const authSuccessAtom = atom<string | null>(null)

// Persisted auth preferences
export const rememberMeAtom = atomWithStorage('rememberMe', false)
export const lastLoginEmailAtom = atomWithStorage<string | null>('lastLoginEmail', null)

// Derived auth atoms
export const isAuthenticatedAtom = atom(get => get(sessionAtom) !== null)

export const userRoleAtom = atom(get => {
  const session = get(sessionAtom)
  if (!session?.user) return null
  // Use userType field for coach/runner differentiation (as per CLAUDE.md)
  // The session user might not have the extended fields, check if it exists
  const user = session.user as User
  return user.userType || 'runner'
})

export const isCoachAtom = atom(get => {
  const role = get(userRoleAtom)
  return role === 'coach'
})

export const isRunnerAtom = atom(get => {
  const role = get(userRoleAtom)
  return role === 'runner'
})

/**
 * Composite auth state atom - combines all auth-related state
 * Migrated from barrel file for better organization
 */
export const authStateAtom = atom({
  user: null as User | null,
  session: null as Session | null,
  loading: false, // Set to false initially to show UI immediately
  error: null as string | null,
})

// Jotai Devtools debug labels
sessionAtom.debugLabel = 'auth/session'
userAtom.debugLabel = 'auth/user'
authLoadingAtom.debugLabel = 'auth/loading'
authErrorAtom.debugLabel = 'auth/error'
authSuccessAtom.debugLabel = 'auth/success'
rememberMeAtom.debugLabel = 'auth/rememberMe'
lastLoginEmailAtom.debugLabel = 'auth/lastLoginEmail'
isAuthenticatedAtom.debugLabel = 'auth/isAuthenticated'
userRoleAtom.debugLabel = 'auth/userRole'
isCoachAtom.debugLabel = 'auth/isCoach'
isRunnerAtom.debugLabel = 'auth/isRunner'
authStateAtom.debugLabel = 'auth/state'
