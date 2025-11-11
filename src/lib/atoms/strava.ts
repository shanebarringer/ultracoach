// Strava integration atoms
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { Workout } from '@/lib/supabase'
import type { StravaActivity, StravaAthlete, StravaConnection } from '@/types/strava'

import { withDebugLabel } from './utils'

// Core Strava atoms
export const stravaActivitiesAtom = atom<StravaActivity[]>([])
export const stravaAthleteAtom = atom<StravaAthlete | null>(null)
export const stravaLoadingAtom = atom(false)
export const stravaErrorAtom = atom<string | null>(null)

// Strava connection state
export const stravaConnectionStatusAtom = atom<{
  status: 'connected' | 'disconnected' | 'loading'
  connected: boolean
}>({
  status: 'loading',
  connected: false,
})
export const stravaAccessTokenAtom = atom<string | null>(null)
export const stravaRefreshTokenAtom = atom<string | null>(null)

// Strava sync state
export const stravaSyncInProgressAtom = atom(false)
export const stravaLastSyncAtom = atomWithStorage<string | null>('stravaLastSync', null)
export const stravaSyncProgressAtom = atom({
  current: 0,
  total: 0,
  message: '',
})

// Strava UI state
export const workoutStravaShowPanelAtom = atom(false)
export const stravaSelectedActivitiesAtom = atom<string[]>([])
export const stravaActivitiesRefreshableAtom = atom(null, async (_get, set) => {
  // Reset activities to trigger a refetch
  set(stravaActivitiesAtom, [])

  // Fetch fresh activities from the API
  try {
    const response = await fetch('/api/strava/activities', { credentials: 'same-origin' })
    if (!response.ok) {
      set(
        stravaErrorAtom,
        `Failed to refresh Strava activities: ${response.status} ${response.statusText}`
      )
      set(stravaActivitiesAtom, [])
      return
    }
    const data = await response.json()
    set(stravaActivitiesAtom, data.activities || [])
  } catch (error) {
    set(stravaErrorAtom, (error as Error)?.message ?? 'Failed to refresh Strava activities')
    set(stravaActivitiesAtom, [])
  }
})

// Strava connection status atom
export const stravaStatusAtom = atom<
  'disconnected' | 'connecting' | 'connected' | 'expired' | 'error'
>('disconnected')

// Auto-reconnect state
export const stravaAutoReconnectAtom = atom<{
  enabled: boolean
  attempts: number
  maxAttempts: number
  lastAttempt: Date | null
}>({
  enabled: false,
  attempts: 0,
  maxAttempts: 3,
  lastAttempt: null,
})

// Sync progress interface
interface SyncProgress {
  total?: number
  synced?: number
  failed?: number
  status?: 'idle' | 'syncing' | 'completed' | 'error'
  message?: string
  // Additional properties for backward compatibility
  totalActivities?: number
  syncedActivities?: number
  pendingActivities?: number
}

// Sync progress
export const syncProgressAtom = atom<SyncProgress>({})

// Strava connection atom
export const stravaConnectionAtom = atom<StravaConnection | null>(null)

// Sync stats atom (derived)
export const syncStatsAtom = atom(get => {
  const syncProgress = get(syncProgressAtom)
  // Return basic sync stats structure with aliases
  const totalActivities = (syncProgress.totalActivities as number) ?? 0
  const syncedActivities = (syncProgress.syncedActivities as number) ?? 0
  const pendingActivities = (syncProgress.pendingActivities as number) ?? 0

  return {
    totalActivities,
    syncedActivities,
    pendingActivities,
    // Add alias properties for backward compatibility
    total: totalActivities,
    synced: syncedActivities,
    pending: pendingActivities,
    ...syncProgress,
  }
})

// Combined Strava state atom for easy consumption (derived)
export const stravaStateAtom = atom(get => {
  const connection = get(stravaConnectionAtom)
  const activities = get(stravaActivitiesAtom)
  const syncStats = get(syncStatsAtom)
  const status = get(stravaStatusAtom)
  const error = get(stravaErrorAtom)
  const autoReconnect = get(stravaAutoReconnectAtom)

  return {
    connection: {
      ...connection,
      connected: status === 'connected',
      isConnected: status === 'connected',
    },
    activities,
    syncStats: {
      ...syncStats,
      total: syncStats.totalActivities,
      synced: syncStats.syncedActivities,
      pending: syncStats.pendingActivities,
    },
    status,
    error,
    autoReconnect,
    isConnected: status === 'connected',
    canSync: status === 'connected',
    needsReconnect: status === 'expired',
    loading: get(stravaLoadingAtom),
  }
})

// Strava actions atom for dispatching actions
export const stravaActionsAtom = atom(
  null,
  async (
    get,
    set,
    action: {
      type: string
      payload?: {
        activities?: unknown[]
        workoutId?: string
        activityId?: string
        [key: string]: unknown
      }
    }
  ) => {
    switch (action.type) {
      case 'CONNECT':
        set(stravaStatusAtom, 'connecting')
        // Handle connection logic
        break
      case 'DISCONNECT':
        set(stravaStatusAtom, 'disconnected')
        set(stravaConnectionAtom, null)
        set(stravaActivitiesAtom, [])
        break
      case 'REFRESH':
        // Handle refresh logic
        break
    }
  }
)

// Trigger workout matching atom
export const triggerWorkoutMatchingAtom = atom(null, async (_get, _set) => {
  // Trigger workout matching logic
  return Promise.resolve()
})

// Matching summary atom for workout comparison
export const matchingSummaryAtom = atom<{
  matched: number
  unmatched: number
  suggestions: number
  byType?: Record<string, { matched: number; unmatched: number; suggestions: number }>
  unmatchedWorkouts?: Workout[]
  lastProcessed?: Date | null
}>({
  matched: 0,
  unmatched: 0,
  suggestions: 0,
  byType: {},
  unmatchedWorkouts: [],
  lastProcessed: null,
})

// Jotai Devtools debug labels (dev-only)
withDebugLabel(stravaActivitiesAtom, 'strava/activities')
withDebugLabel(stravaAthleteAtom, 'strava/athlete')
withDebugLabel(stravaLoadingAtom, 'strava/loading')
withDebugLabel(stravaErrorAtom, 'strava/error')
withDebugLabel(stravaConnectionStatusAtom, 'strava/connectionStatus')
withDebugLabel(stravaAccessTokenAtom, 'strava/accessToken')
withDebugLabel(stravaRefreshTokenAtom, 'strava/refreshToken')
withDebugLabel(stravaSyncInProgressAtom, 'strava/syncInProgress')
withDebugLabel(stravaLastSyncAtom, 'strava/lastSync')
withDebugLabel(stravaSyncProgressAtom, 'strava/syncProgress')
withDebugLabel(workoutStravaShowPanelAtom, 'strava/workoutShowPanel')
withDebugLabel(stravaSelectedActivitiesAtom, 'strava/selectedActivities')
withDebugLabel(stravaActivitiesRefreshableAtom, 'strava/activitiesRefreshable')
withDebugLabel(stravaStatusAtom, 'strava/status')
withDebugLabel(stravaAutoReconnectAtom, 'strava/autoReconnect')
withDebugLabel(syncProgressAtom, 'strava/syncProgressV2')
withDebugLabel(stravaConnectionAtom, 'strava/connection')
withDebugLabel(syncStatsAtom, 'strava/syncStats')
withDebugLabel(stravaStateAtom, 'strava/state')
withDebugLabel(stravaActionsAtom, 'strava/actions')
withDebugLabel(triggerWorkoutMatchingAtom, 'strava/triggerWorkoutMatching')
withDebugLabel(matchingSummaryAtom, 'strava/matchingSummary')
