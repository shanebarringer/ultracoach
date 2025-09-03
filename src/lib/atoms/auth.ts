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
