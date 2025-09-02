// Authentication and user session atoms
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { User, Session } from '@/types/auth'

// Core auth atoms
export const sessionAtom = atom<Record<string, unknown> | null>(null)
export const userAtom = atom<Record<string, unknown> | null>(null)
export const isAuthLoadingAtom = atom(true)

// Auth state atoms
export const authErrorAtom = atom<string | null>(null)
export const authSuccessAtom = atom<string | null>(null)

// Persisted auth preferences
export const rememberMeAtom = atomWithStorage('rememberMe', false)
export const lastLoginEmailAtom = atomWithStorage<string | null>('lastLoginEmail', null)