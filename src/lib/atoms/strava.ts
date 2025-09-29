// Strava integration atoms
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { Workout } from '@/lib/supabase'
import type { StravaActivity, StravaAthlete, StravaConnection } from '@/types/strava'

// Core Strava atoms
export const stravaActivitiesAtom = atom<StravaActivity[]>([])
stravaActivitiesAtom.debugLabel = 'stravaActivitiesAtom'
export const stravaAthleteAtom = atom<StravaAthlete | null>(null)
stravaAthleteAtom.debugLabel = 'stravaAthleteAtom'
export const stravaLoadingAtom = atom(false)
stravaLoadingAtom.debugLabel = 'stravaLoadingAtom'
export const stravaErrorAtom = atom<string | null>(null)
stravaErrorAtom.debugLabel = 'stravaErrorAtom'

// Strava connection state
export const stravaConnectionStatusAtom = atom<{
  status: 'connected' | 'disconnected' | 'loading'
  connected: boolean
}>({
  status: 'loading',
  connected: false,
})
stravaConnectionStatusAtom.debugLabel = 'stravaConnectionStatusAtom'
export const stravaAccessTokenAtom = atom<string | null>(null)
stravaAccessTokenAtom.debugLabel = 'stravaAccessTokenAtom'
export const stravaRefreshTokenAtom = atom<string | null>(null)
stravaRefreshTokenAtom.debugLabel = 'stravaRefreshTokenAtom'

// Strava sync state
export const stravaSyncInProgressAtom = atom(false)
stravaSyncInProgressAtom.debugLabel = 'stravaSyncInProgressAtom'
export const stravaLastSyncAtom = atomWithStorage<string | null>('stravaLastSync', null)
stravaLastSyncAtom.debugLabel = 'stravaLastSyncAtom'
export const stravaSyncProgressAtom = atom({
  current: 0,
  total: 0,
  message: '',
})

// Strava UI state
stravaSyncProgressAtom.debugLabel = 'stravaSyncProgressAtom'
export const workoutStravaShowPanelAtom = atom(false)
workoutStravaShowPanelAtom.debugLabel = 'workoutStravaShowPanelAtom'
export const stravaSelectedActivitiesAtom = atom<string[]>([])
stravaSelectedActivitiesAtom.debugLabel = 'stravaSelectedActivitiesAtom'
export const stravaActivitiesRefreshableAtom = atom(null, async (_get, set) => {
  // Reset activities to trigger a refetch
  set(stravaActivitiesAtom, [])

  // Fetch fresh activities from the API
  try {
    const response = await fetch('/api/strava/activities')
    if (response.ok) {
      const data = await response.json()
      set(stravaActivitiesAtom, data.activities || [])
    }
  } catch (error) {
    console.error('Failed to refresh Strava activities:', error)
    set(stravaActivitiesAtom, [])
  }
})

// Strava connection status atom
stravaActivitiesRefreshableAtom.debugLabel = 'stravaActivitiesRefreshableAtom'
export const stravaStatusAtom = atom<
  'disconnected' | 'connecting' | 'connected' | 'expired' | 'error'
>('disconnected')
stravaStatusAtom.debugLabel = 'stravaStatusAtom'

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
stravaAutoReconnectAtom.debugLabel = 'stravaAutoReconnectAtom'

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
syncProgressAtom.debugLabel = 'syncProgressAtom'
export const stravaConnectionAtom = atom<StravaConnection | null>(null)
stravaConnectionAtom.debugLabel = 'stravaConnectionAtom'

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
syncStatsAtom.debugLabel = 'syncStatsAtom'
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
stravaStateAtom.debugLabel = 'stravaStateAtom'
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
stravaActionsAtom.debugLabel = 'stravaActionsAtom'
export const triggerWorkoutMatchingAtom = atom(null, async (_get, _set) => {
  // Trigger workout matching logic
  return Promise.resolve()
})

// Matching summary atom for workout comparison
triggerWorkoutMatchingAtom.debugLabel = 'triggerWorkoutMatchingAtom'
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
matchingSummaryAtom.debugLabel = 'matchingSummaryAtom'
