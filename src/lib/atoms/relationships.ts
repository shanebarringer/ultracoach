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
import { normalizeListResponse } from '../utils/api-utils'
import { withDebugLabel } from './utils'

// Environment check
const isBrowser = typeof window !== 'undefined'

// Core relationship atoms
export const relationshipsAtom = atom<RelationshipData[]>([])
export const relationshipsLoadingAtom = atom(false)
export const relationshipsErrorAtom = atom<string | null>(null)

// Module-scoped loggers to avoid re-instantiating per atom read
const relationshipsLogger = createLogger('RelationshipsAsyncAtom')
const connectedRunnersLogger = createLogger('ConnectedRunnersAtom')
const availableCoachesLogger = createLogger('AvailableCoachesAtom')
const availableRunnersLogger = createLogger('AvailableRunnersAtom')

// Async atom that fetches relationships
export const relationshipsAsyncAtom = atom(async () => {
  // Return empty array for SSR to prevent URL errors
  if (!isBrowser) return []

  try {
    const response = await api.get<RelationshipData[] | { relationships: RelationshipData[] }>(
      '/api/coach-runners',
      {
        suppressGlobalToast: true,
      }
    )
    const data = response.data
    return normalizeListResponse(data, 'relationships')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    relationshipsLogger.error('Failed to fetch relationships', { message })
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

// Connected runners atom (Suspense-friendly async atom)
// - Returns a plain User[] when resolved
// - Uses atomWithRefresh so callers can `set(connectedRunnersAtom)` to refetch
export const connectedRunnersAtom = atomWithRefresh(async (): Promise<User[]> => {
  // Avoid network calls during SSR
  if (!isBrowser) return []

  try {
    connectedRunnersLogger.debug('Fetching connected runners...')
    const response = await api.get<{ runners?: User[] } | User[]>('/api/runners', {
      suppressGlobalToast: true,
    })

    const data = response.data
    const runners = normalizeListResponse<User>(data, 'runners')
    connectedRunnersLogger.debug('Connected runners fetched', { count: runners.length })
    return runners
  } catch (error) {
    // Do not throw to avoid infinite Suspense loops; log and return empty list
    connectedRunnersLogger.error('Error fetching connected runners', error)
    return []
  }
})

// Helper factory for creating available users atoms (DRY pattern)
function makeAvailableUsersAtom<T extends User>(
  url: string,
  key: string,
  logger: ReturnType<typeof createLogger>
) {
  return atomWithRefresh(async () => {
    if (!isBrowser) return []
    try {
      const response = await api.get<Record<string, T[]> | T[]>(url, { suppressGlobalToast: true })
      return normalizeListResponse<T>(response.data, key)
    } catch (error) {
      logger.error(`Error fetching ${key}`, error)
      return []
    }
  })
}

// Available coaches atom
export const availableCoachesAtom = makeAvailableUsersAtom<User>(
  '/api/coaches/available',
  'coaches',
  availableCoachesLogger
)

// Available runners atom
export const availableRunnersAtom = makeAvailableUsersAtom<User>(
  '/api/runners/available',
  'runners',
  availableRunnersLogger
)

// Jotai Devtools debug labels (dev-only)
withDebugLabel(relationshipsAtom, 'relationships/list')
withDebugLabel(relationshipsLoadingAtom, 'relationships/loading')
withDebugLabel(relationshipsErrorAtom, 'relationships/error')
withDebugLabel(relationshipsAsyncAtom, 'relationships/async')
withDebugLabel(relationshipsLoadableAtom, 'relationships/loadable')
withDebugLabel(selectedRelationshipAtom, 'relationships/selected')
withDebugLabel(selectedRelationshipIdAtom, 'relationships/selectedId')
withDebugLabel(relationshipStatusFilterAtom, 'relationships/statusFilter')
withDebugLabel(relationshipSearchTermAtom, 'relationships/searchTerm')
withDebugLabel(inviteRunnerFormAtom, 'relationships/inviteRunnerForm')
withDebugLabel(connectCoachFormAtom, 'relationships/connectCoachForm')
withDebugLabel(runnerSearchTermAtom, 'relationships/runnerSearchTerm')
withDebugLabel(connectingRunnerIdsAtom, 'relationships/connectingRunnerIds')
withDebugLabel(runnersAtom, 'relationships/runners')
withDebugLabel(connectedRunnersAtom, 'relationships/connectedRunners')
withDebugLabel(availableCoachesAtom, 'relationships/availableCoaches')
withDebugLabel(availableRunnersAtom, 'relationships/availableRunners')
