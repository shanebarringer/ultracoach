/**
 * Coach-runner relationship atoms
 *
 * This module manages all coach-runner relationship state including
 * connections, invitations, and user discovery.
 *
 * @module atoms/relationships
 */
import { atom } from 'jotai'
import { atomWithRefresh, loadable } from 'jotai/utils'

import type { RelationshipData } from '@/types/relationships'

import { createLogger } from '../logger'
import type { User } from '../supabase'

// Environment check
const isBrowser = typeof window !== 'undefined'

// Core relationship atoms
export const relationshipsAtom = atom<RelationshipData[]>([])
export const relationshipsLoadingAtom = atom(false)
export const relationshipsErrorAtom = atom<string | null>(null)

// Async atom that fetches relationships
export const relationshipsAsyncAtom = atom(async () => {
  // Return empty array for SSR to prevent URL errors
  if (!isBrowser) return []

  const logger = createLogger('RelationshipsAsyncAtom')

  try {
    const response = await fetch('/api/coach-runners', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    })
    if (response.ok) {
      const data = await response.json()
      return Array.isArray(data) ? data : data.relationships || []
    }
    return []
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Failed to fetch relationships', { message })
    return []
  }
})

// Loadable version for suspense support
export const relationshipsLoadableAtom = loadable(relationshipsAsyncAtom)

// Selected relationship atoms
export const selectedRelationshipAtom = atom<RelationshipData | null>(null)
export const selectedRelationshipIdAtom = atom<string | null>(null)

// Relationship filtering
export const relationshipStatusFilterAtom = atom<'all' | 'active' | 'pending' | 'inactive'>('all')
export const relationshipSearchTermAtom = atom('')

// Relationship form atoms
export const inviteRunnerFormAtom = atom({
  email: '',
  name: '',
  message: '',
})

export const connectCoachFormAtom = atom({
  coachId: '',
  message: '',
})

// Search and connection state
export const runnerSearchTermAtom = atom<string>('')
export const connectingRunnerIdsAtom = atom<Set<string>>(new Set<string>())

/**
 * Runners list atom - stores all available runners
 * Migrated from barrel file for better organization
 */
export const runnersAtom = atom<User[]>([])

// Connected runners atom for coaches
export const connectedRunnersAtom = atomWithRefresh(async () => {
  // Return empty array for SSR to ensure consistency
  if (!isBrowser) return []

  const logger = createLogger('ConnectedRunnersAtom')
  try {
    logger.debug('Fetching connected runners...')
    const response = await fetch('/api/runners', {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
    })
    if (!response.ok) {
      logger.error(`Failed to fetch connected runners: ${response.status} ${response.statusText}`)
      return []
    }
    const data = await response.json()

    // Extract runners array from response object
    const runners = Array.isArray(data) ? data : data.runners || []
    logger.debug('Connected runners fetched', { count: runners.length })
    return runners as User[]
  } catch (error) {
    logger.error('Error fetching connected runners', error)
    return []
  }
})

// Available coaches atom
export const availableCoachesAtom = atomWithRefresh(async () => {
  if (!isBrowser) return []
  const logger = createLogger('AvailableCoachesAtom')
  try {
    const response = await fetch('/api/coaches/available', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    })
    if (!response.ok) return []
    const data = await response.json()
    // API returns { coaches: [...] }, extract the array
    const coaches = data.coaches || data
    return Array.isArray(coaches) ? (coaches as User[]) : []
  } catch (error) {
    logger.error('Error fetching available coaches', error)
    return []
  }
})

// Available runners atom
export const availableRunnersAtom = atomWithRefresh(async () => {
  if (!isBrowser) return []
  const logger = createLogger('AvailableRunnersAtom')
  try {
    const response = await fetch('/api/runners/available', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    })
    if (!response.ok) return []
    const data = await response.json()
    // API returns { runners: [...] }, extract the array
    const runners = data.runners || data
    return Array.isArray(runners) ? (runners as User[]) : []
  } catch (error) {
    logger.error('Error fetching available runners', error)
    return []
  }
})
