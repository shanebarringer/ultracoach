// Authentication and user session atoms
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { Session, User } from '@/lib/better-auth-client'

// Core auth atoms
export const sessionAtom = atom<Session | null>(null)
export const userAtom = atom<User | null>(null)
export const authLoadingAtom = atom(true)

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (session.user as any).userType || 'runner'
})

export const isCoachAtom = atom(get => {
  const role = get(userRoleAtom)
  return role === 'coach'
})

export const isRunnerAtom = atom(get => {
  const role = get(userRoleAtom)
  return role === 'runner'
})
