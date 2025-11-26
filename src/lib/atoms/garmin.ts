// Garmin integration atoms
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'
import type { GarminActivity, GarminDevice, GarminUserProfile } from '@/types/garmin'

const logger = createLogger('garmin-atoms')

// Core Garmin atoms
export const garminActivitiesAtom = atom<GarminActivity[]>([])
export const garminProfileAtom = atom<GarminUserProfile | null>(null)
export const garminDevicesAtom = atom<GarminDevice[]>([])
export const garminLoadingAtom = atom(false)
export const garminErrorAtom = atom<string | null>(null)

// Garmin connection state
export const garminConnectionStatusAtom = atom<{
  status: 'connected' | 'disconnected' | 'loading'
  connected: boolean
}>({
  status: 'loading',
  connected: false,
})

export const garminAccessTokenAtom = atom<string | null>(null)
export const garminRefreshTokenAtom = atom<string | null>(null)

// Garmin sync state
export const garminSyncInProgressAtom = atom(false)
export const garminLastSyncAtom = atomWithStorage<string | null>('garminLastSync', null)
export const garminSyncProgressAtom = atom({
  current: 0,
  total: 0,
  message: '',
})

// Garmin UI state
export const workoutGarminShowPanelAtom = atom(false)
export const garminSelectedActivitiesAtom = atom<string[]>([])

// Refreshable atom for fetching activities
export const garminActivitiesRefreshableAtom = atom(null, async (_get, set) => {
  // Reset activities to trigger a refetch
  set(garminActivitiesAtom, [])

  // Fetch fresh activities from the API
  try {
    const response = await fetch('/api/garmin/activities', { credentials: 'same-origin' })
    if (!response.ok) {
      set(
        garminErrorAtom,
        `Failed to refresh Garmin activities: ${response.status} ${response.statusText}`
      )
      set(garminActivitiesAtom, [])
      return
    }
    const data = await response.json()
    set(garminActivitiesAtom, data.activities || [])
  } catch (error) {
    set(garminErrorAtom, (error as Error)?.message ?? 'Failed to refresh Garmin activities')
    set(garminActivitiesAtom, [])
  }
})

// Garmin connection status atom
export const garminStatusAtom = atom<
  'disconnected' | 'connecting' | 'connected' | 'expired' | 'error'
>('disconnected')

// Auto-reconnect state
export const garminAutoReconnectAtom = atom<{
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
  totalWorkouts?: number
  syncedWorkouts?: number
  pendingWorkouts?: number
}

// Sync progress
export const garminSyncProgressDetailedAtom = atom<SyncProgress>({})

// Sync stats atom (derived)
export const garminSyncStatsAtom = atom(get => {
  const syncProgress = get(garminSyncProgressDetailedAtom)
  const totalWorkouts = (syncProgress.totalWorkouts as number) ?? 0
  const syncedWorkouts = (syncProgress.syncedWorkouts as number) ?? 0
  const pendingWorkouts = (syncProgress.pendingWorkouts as number) ?? 0

  return {
    totalWorkouts,
    syncedWorkouts,
    pendingWorkouts,
    // Add alias properties for backward compatibility
    total: totalWorkouts,
    synced: syncedWorkouts,
    pending: pendingWorkouts,
    ...syncProgress,
  }
})

// Combined Garmin state atom for easy consumption (derived)
export const garminStateAtom = atom(get => {
  const profile = get(garminProfileAtom)
  const devices = get(garminDevicesAtom)
  const activities = get(garminActivitiesAtom)
  const syncStats = get(garminSyncStatsAtom)
  const status = get(garminStatusAtom)
  const error = get(garminErrorAtom)
  const autoReconnect = get(garminAutoReconnectAtom)

  return {
    profile,
    devices,
    activities,
    syncStats: {
      ...syncStats,
      total: syncStats.totalWorkouts,
      synced: syncStats.syncedWorkouts,
      pending: syncStats.pendingWorkouts,
    },
    status,
    error,
    autoReconnect,
    isConnected: status === 'connected',
    canSync: status === 'connected',
    needsReconnect: status === 'expired',
    loading: get(garminLoadingAtom),
  }
})

// Garmin actions atom for dispatching actions
export const garminActionsAtom = atom(
  null,
  async (
    get,
    set,
    action: {
      type: string
      payload?: {
        workouts?: unknown[]
        workoutId?: string
        activityId?: string
        syncMode?: 'single' | 'bulk'
        [key: string]: unknown
      }
    }
  ) => {
    switch (action.type) {
      case 'CONNECT':
        set(garminStatusAtom, 'connecting')
        // Handle connection logic
        break

      case 'DISCONNECT':
        set(garminStatusAtom, 'disconnected')
        set(garminProfileAtom, null)
        set(garminActivitiesAtom, [])
        set(garminDevicesAtom, [])
        break

      case 'REFRESH':
        set(garminLoadingAtom, true)
        try {
          await set(garminActivitiesRefreshableAtom)
        } finally {
          set(garminLoadingAtom, false)
        }
        break

      case 'SYNC_WORKOUT': {
        const { workoutId } = action.payload || {}
        if (!workoutId) {
          set(garminErrorAtom, 'Workout ID is required for sync')
          return
        }

        set(garminSyncInProgressAtom, true)
        try {
          const response = await fetch('/api/garmin/sync', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workout_ids: [workoutId],
              sync_mode: 'single',
            }),
          })

          if (!response.ok) {
            throw new Error(`Sync failed: ${response.statusText}`)
          }

          const data = await response.json()
          set(garminSyncProgressDetailedAtom, {
            synced: data.synced || 0,
            total: data.total || 1,
            status: 'completed',
          })
        } catch (error) {
          set(garminErrorAtom, (error as Error)?.message ?? 'Failed to sync workout')
        } finally {
          set(garminSyncInProgressAtom, false)
        }
        break
      }

      case 'SYNC_BULK': {
        const { workouts } = action.payload || {}
        if (!workouts || !Array.isArray(workouts)) {
          set(garminErrorAtom, 'Workouts array is required for bulk sync')
          return
        }

        set(garminSyncInProgressAtom, true)
        try {
          const response = await fetch('/api/garmin/sync', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workout_ids: workouts,
              sync_mode: 'bulk',
            }),
          })

          if (!response.ok) {
            throw new Error(`Bulk sync failed: ${response.statusText}`)
          }

          const data = await response.json()
          set(garminSyncProgressDetailedAtom, {
            synced: data.synced || 0,
            total: data.total || workouts.length,
            failed: data.failed || 0,
            status: 'completed',
          })
        } catch (error) {
          set(garminErrorAtom, (error as Error)?.message ?? 'Failed to sync workouts')
        } finally {
          set(garminSyncInProgressAtom, false)
        }
        break
      }

      case 'IMPORT_ACTIVITY': {
        const { activityId, workoutId } = action.payload || {}
        if (!activityId) {
          set(garminErrorAtom, 'Activity ID is required for import')
          return
        }

        set(garminLoadingAtom, true)
        try {
          const response = await fetch('/api/garmin/import', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activity_id: activityId,
              workout_id: workoutId, // Optional - auto-match if not provided
            }),
          })

          if (!response.ok) {
            throw new Error(`Import failed: ${response.statusText}`)
          }

          // Refresh activities after successful import
          await set(garminActivitiesRefreshableAtom)
        } catch (error) {
          set(garminErrorAtom, (error as Error)?.message ?? 'Failed to import activity')
        } finally {
          set(garminLoadingAtom, false)
        }
        break
      }

      default:
        logger.warn('Unknown Garmin action type', { actionType: action.type })
    }
  }
)

// Matching summary atom for workout comparison
export const garminMatchingSummaryAtom = atom<{
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
