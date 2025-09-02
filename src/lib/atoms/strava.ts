// Strava integration atoms
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { StravaActivity, StravaAthlete } from '@/types/strava'

// Core Strava atoms
export const stravaActivitiesAtom = atom<StravaActivity[]>([])
export const stravaAthleteAtom = atom<StravaAthlete | null>(null)
export const stravaLoadingAtom = atom(false)
export const stravaErrorAtom = atom<string | null>(null)

// Strava connection state
export const stravaConnectionStatusAtom = atom<'connected' | 'disconnected' | 'loading'>('loading')
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
export const stravaActivitiesRefreshableAtom = atom(
  null,
  async (_get, _set) => {
    // Refresh Strava activities logic
    return Promise.resolve()
  }
)

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
export const stravaConnectionAtom = atom<unknown>(null)

// Sync stats atom (derived)
export const syncStatsAtom = atom(get => {
  const syncProgress = get(syncProgressAtom)
  // Return basic sync stats structure
  return {
    totalActivities: 0,
    syncedActivities: 0,
    pendingActivities: 0,
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
    connection,
    activities,
    syncStats,
    status,
    error,
    autoReconnect,
    isConnected: status === 'connected',
    canSync: status === 'connected',
    needsReconnect: status === 'expired',
    loading: get(stravaLoadingAtom),
  }
})