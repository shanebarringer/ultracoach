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
sessionAtom.debugLabel = 'sessionAtom'

/**
 * Current user atom - holds the authenticated user data
 */
export const userAtom = atom<User | null>(null)
userAtom.debugLabel = 'userAtom'

/**
 * Auth loading state - tracks authentication initialization
 * Set to false initially to show UI immediately for unauthenticated users
 */
export const authLoadingAtom = atom(false)
authLoadingAtom.debugLabel = 'authLoadingAtom'

// Auth state atoms
export const authErrorAtom = atom<string | null>(null)
authErrorAtom.debugLabel = 'authErrorAtom'
export const authSuccessAtom = atom<string | null>(null)
authSuccessAtom.debugLabel = 'authSuccessAtom'

// Persisted auth preferences
export const rememberMeAtom = atomWithStorage('rememberMe', false)
rememberMeAtom.debugLabel = 'rememberMeAtom'
export const lastLoginEmailAtom = atomWithStorage<string | null>('lastLoginEmail', null)
lastLoginEmailAtom.debugLabel = 'lastLoginEmailAtom'

// Derived auth atoms
export const isAuthenticatedAtom = atom(get => get(sessionAtom) !== null)
isAuthenticatedAtom.debugLabel = 'isAuthenticatedAtom'

export const userRoleAtom = atom(get => {
  const session = get(sessionAtom)
  if (!session?.user) return null
  // Use userType field for coach/runner differentiation (as per CLAUDE.md)
  // The session user might not have the extended fields, check if it exists
  const user = session.user as User
  return user.userType || 'runner'
})

userRoleAtom.debugLabel = 'userRoleAtom'

export const isCoachAtom = atom(get => {
  const role = get(userRoleAtom)
  return role === 'coach'
})

isCoachAtom.debugLabel = 'isCoachAtom'

export const isRunnerAtom = atom(get => {
  const role = get(userRoleAtom)
  return role === 'runner'
})

isRunnerAtom.debugLabel = 'isRunnerAtom'

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

authStateAtom.debugLabel = 'authStateAtom'
