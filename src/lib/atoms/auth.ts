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

import { withDebugLabel } from '@/lib/atoms/utils'
import type { Session, User } from '@/lib/better-auth-client'

// Core auth atoms

/**
 * Current session atom - holds the active Better Auth session
 */
export const sessionAtom = withDebugLabel(atom<Session | null>(null), 'sessionAtom')

/**
 * Current user atom - holds the authenticated user data
 */
export const userAtom = withDebugLabel(atom<User | null>(null), 'userAtom')

/**
 * Auth loading state - tracks authentication initialization
 * Set to false initially to show UI immediately for unauthenticated users
 */
export const authLoadingAtom = withDebugLabel(atom(false), 'authLoadingAtom')

// Auth state atoms
export const authErrorAtom = withDebugLabel(atom<string | null>(null), 'authErrorAtom')
export const authSuccessAtom = withDebugLabel(atom<string | null>(null), 'authSuccessAtom')

// Persisted auth preferences
export const rememberMeAtom = withDebugLabel(atomWithStorage('rememberMe', false), 'rememberMeAtom')
export const lastLoginEmailAtom = withDebugLabel(
  atomWithStorage<string | null>('lastLoginEmail', null),
  'lastLoginEmailAtom'
)

// Derived auth atoms
export const isAuthenticatedAtom = withDebugLabel(
  atom(get => get(sessionAtom) !== null),
  'isAuthenticatedAtom'
)

export const userRoleAtom = withDebugLabel(
  atom(get => {
    const session = get(sessionAtom)
    if (!session?.user) return null
    // Use userType field for coach/runner differentiation (as per CLAUDE.md)
    // The session user might not have the extended fields, check if it exists
    const user = session.user as User
    return user.userType || 'runner'
  }),
  'userRoleAtom'
)

export const isCoachAtom = withDebugLabel(
  atom(get => {
    const role = get(userRoleAtom)
    return role === 'coach'
  }),
  'isCoachAtom'
)

export const isRunnerAtom = withDebugLabel(
  atom(get => {
    const role = get(userRoleAtom)
    return role === 'runner'
  }),
  'isRunnerAtom'
)

/**
 * Composite auth state atom - combines all auth-related state
 * Migrated from barrel file for better organization
 */
export const authStateAtom = withDebugLabel(
  atom({
    user: null as User | null,
    session: null as Session | null,
    loading: false, // Set to false initially to show UI immediately
    error: null as string | null,
  }),
  'authStateAtom'
)
