// Strava integration atoms
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { Workout } from '@/lib/supabase'
import type { StravaActivity, StravaAthlete } from '@/types/strava'

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
export const stravaActivitiesRefreshableAtom = atom(null, async (_get, _set) => {
  // Refresh Strava activities logic
  return Promise.resolve()
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

// Sync progress
export const syncProgressAtom = atom<Record<string, unknown>>({})

// Strava connection atom
export const stravaConnectionAtom = atom<Record<string, unknown> | null>(null)

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
  async (get, set, action: { type: string; payload?: Record<string, unknown> }) => {
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
