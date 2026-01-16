// Strava integration atoms
import { isAxiosError } from 'axios'
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import { api } from '@/lib/api-client'
import type { Workout } from '@/lib/supabase'
import type { StravaActivity, StravaAthlete, StravaConnection } from '@/types/strava'

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
    const response = await api.get<{ activities: StravaActivity[] }>('/api/strava/activities', {
      suppressGlobalToast: true, // Atom handles its own error handling
    })
    set(stravaActivitiesAtom, response.data.activities || [])
  } catch (error) {
    // Extract error message from axios error or fallback to generic message
    const errorMessage =
      isAxiosError(error) && error.response
        ? `Failed to refresh Strava activities: ${error.response.status} ${error.response.statusText}`
        : error instanceof Error
          ? error.message
          : 'Failed to refresh Strava activities'
    set(stravaErrorAtom, errorMessage)
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

// Jotai Devtools debug labels
stravaActivitiesAtom.debugLabel = 'strava/activities'
stravaAthleteAtom.debugLabel = 'strava/athlete'
stravaLoadingAtom.debugLabel = 'strava/loading'
stravaErrorAtom.debugLabel = 'strava/error'
stravaConnectionStatusAtom.debugLabel = 'strava/connectionStatus'
stravaAccessTokenAtom.debugLabel = 'strava/accessToken'
stravaRefreshTokenAtom.debugLabel = 'strava/refreshToken'
stravaSyncInProgressAtom.debugLabel = 'strava/syncInProgress'
stravaLastSyncAtom.debugLabel = 'strava/lastSync'
stravaSyncProgressAtom.debugLabel = 'strava/syncProgress'
workoutStravaShowPanelAtom.debugLabel = 'strava/workoutShowPanel'
stravaSelectedActivitiesAtom.debugLabel = 'strava/selectedActivities'
stravaActivitiesRefreshableAtom.debugLabel = 'strava/activitiesRefreshable'
stravaStatusAtom.debugLabel = 'strava/status'
stravaAutoReconnectAtom.debugLabel = 'strava/autoReconnect'
syncProgressAtom.debugLabel = 'strava/syncProgressV2'
stravaConnectionAtom.debugLabel = 'strava/connection'
syncStatsAtom.debugLabel = 'strava/syncStats'
stravaStateAtom.debugLabel = 'strava/state'
stravaActionsAtom.debugLabel = 'strava/actions'
triggerWorkoutMatchingAtom.debugLabel = 'strava/triggerWorkoutMatching'
matchingSummaryAtom.debugLabel = 'strava/matchingSummary'
