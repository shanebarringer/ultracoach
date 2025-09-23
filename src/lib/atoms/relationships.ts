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

import { api } from '../api-client'
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
    const response = await api.get<RelationshipData[] | { relationships: RelationshipData[] }>('/api/coach-runners', {
      suppressGlobalToast: true,
    })
    const data = response.data
    return Array.isArray(data) ? data : (data as { relationships: RelationshipData[] }).relationships || []
  } catch (error) {
    logger.error('Failed to fetch relationships:', error)
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

// Connected runners atom state interface
interface ConnectedRunnersState {
  data: User[]
  isLoading: boolean
  hasLoaded: boolean
  error: string | null
}

// Connected runners atom for coaches with loading state
export const connectedRunnersAtom = atomWithRefresh(async (): Promise<ConnectedRunnersState> => {
  // Return initial state for SSR to ensure consistency
  if (!isBrowser) return { data: [], isLoading: false, hasLoaded: false, error: null }

  const logger = createLogger('ConnectedRunnersAtom')
  try {
    logger.debug('Fetching connected runners...')
    const response = await api.get<{ runners?: User[] } | User[]>('/api/runners', {
      suppressGlobalToast: true,
    })

    const data = response.data
    // Extract runners array from response object
    const runners = Array.isArray(data) ? data : data.runners || []
    logger.debug('Connected runners fetched', { count: runners.length })
    return { data: runners as User[], isLoading: false, hasLoaded: true, error: null }
  } catch (error) {
    logger.error('Error fetching connected runners', error)
    return {
      data: [],
      isLoading: false,
      hasLoaded: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})

// Loadable version for proper async handling
export const connectedRunnersLoadableAtom = loadable(connectedRunnersAtom)

// Derived atoms for easier access
export const connectedRunnersDataAtom = atom(get => {
  const loadable = get(connectedRunnersLoadableAtom)
  if (loadable.state === 'hasData') {
    return loadable.data.data
  }
  return []
})

export const connectedRunnersLoadingAtom = atom(get => {
  const loadable = get(connectedRunnersLoadableAtom)
  // Show loading during actual loading OR during initial fetch when hasLoaded is false
  if (loadable.state === 'loading') {
    return true
  }
  if (loadable.state === 'hasData' && !loadable.data.hasLoaded) {
    return true
  }
  return false
})

// Backward compatibility export - simplified alias
export const connectedRunnersCompatAtom = connectedRunnersDataAtom

// Available coaches atom
export const availableCoachesAtom = atomWithRefresh(async () => {
  if (!isBrowser) return []
  const logger = createLogger('AvailableCoachesAtom')
  try {
    const response = await api.get<{ coaches?: User[] } | User[]>('/api/coaches/available', {
      suppressGlobalToast: true,
    })
    const data = response.data
    // API returns { coaches: [...] }, extract the array
    const coaches = Array.isArray(data) ? data : data.coaches || []
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
    const response = await api.get<{ runners?: User[] } | User[]>('/api/runners/available', {
      suppressGlobalToast: true,
    })
    const data = response.data
    // API returns { runners: [...] }, extract the array
    const runners = Array.isArray(data) ? data : data.runners || []
    return Array.isArray(runners) ? (runners as User[]) : []
  } catch (error) {
    logger.error('Error fetching available runners', error)
    return []
  }
})
