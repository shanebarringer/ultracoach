/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Strava Atoms Unit Tests
 *
 * Tests the Strava integration atoms
 */
import { createStore } from 'jotai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  matchingSummaryAtom,
  stravaAccessTokenAtom,
  stravaActionsAtom,
  stravaActivitiesAtom,
  stravaAthleteAtom,
  stravaAutoReconnectAtom,
  stravaConnectionAtom,
  stravaConnectionStatusAtom,
  stravaErrorAtom,
  stravaLastSyncAtom,
  stravaLoadingAtom,
  stravaRefreshTokenAtom,
  stravaSelectedActivitiesAtom,
  stravaStateAtom,
  stravaStatusAtom,
  stravaSyncInProgressAtom,
  stravaSyncProgressAtom,
  syncProgressAtom,
  syncStatsAtom,
  workoutStravaShowPanelAtom,
} from '@/lib/atoms/strava'

import { createTestStore, getAtomValue, setAtomValue, setupCommonMocks } from './utils/test-helpers'

describe('Strava Atoms', () => {
  let store: ReturnType<typeof createStore>
  let cleanup: () => void

  beforeEach(() => {
    const mocks = setupCommonMocks()
    cleanup = mocks.cleanup
    store = createTestStore()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('Core Strava atoms', () => {
    it('should have empty array as initial value for stravaActivitiesAtom', () => {
      const activities = getAtomValue(store, stravaActivitiesAtom)
      expect(activities).toEqual([])
    })

    it('should store Strava activities', () => {
      const mockActivities = [
        { id: 'a1', name: 'Morning Run', type: 'Run', distance: 10000 },
        { id: 'a2', name: 'Evening Ride', type: 'Ride', distance: 20000 },
      ] as any[]

      setAtomValue(store, stravaActivitiesAtom, mockActivities)

      const activities = getAtomValue(store, stravaActivitiesAtom)
      expect(activities).toHaveLength(2)
      expect(activities[0].name).toBe('Morning Run')
      expect(activities[1].type).toBe('Ride')
    })

    it('should track athlete information', () => {
      expect(getAtomValue(store, stravaAthleteAtom)).toBe(null)

      const mockAthlete = {
        id: 123456,
        firstname: 'John',
        lastname: 'Doe',
        profile: 'profile.jpg',
      } as any

      setAtomValue(store, stravaAthleteAtom, mockAthlete)
      expect(getAtomValue(store, stravaAthleteAtom)).toEqual(mockAthlete)
    })

    it('should track loading state', () => {
      expect(getAtomValue(store, stravaLoadingAtom)).toBe(false)

      setAtomValue(store, stravaLoadingAtom, true)
      expect(getAtomValue(store, stravaLoadingAtom)).toBe(true)
    })

    it('should track error state', () => {
      expect(getAtomValue(store, stravaErrorAtom)).toBe(null)

      setAtomValue(store, stravaErrorAtom, 'Failed to connect to Strava')
      expect(getAtomValue(store, stravaErrorAtom)).toBe('Failed to connect to Strava')
    })
  })

  describe('Connection state atoms', () => {
    it('should track connection status', () => {
      const initial = getAtomValue(store, stravaConnectionStatusAtom)
      expect(initial).toEqual({
        status: 'loading',
        connected: false,
      })

      setAtomValue(store, stravaConnectionStatusAtom, {
        status: 'connected',
        connected: true,
      })

      expect(getAtomValue(store, stravaConnectionStatusAtom)).toEqual({
        status: 'connected',
        connected: true,
      })
    })

    it('should track access token', () => {
      expect(getAtomValue(store, stravaAccessTokenAtom)).toBe(null)

      setAtomValue(store, stravaAccessTokenAtom, 'access-token-123')
      expect(getAtomValue(store, stravaAccessTokenAtom)).toBe('access-token-123')
    })

    it('should track refresh token', () => {
      expect(getAtomValue(store, stravaRefreshTokenAtom)).toBe(null)

      setAtomValue(store, stravaRefreshTokenAtom, 'refresh-token-456')
      expect(getAtomValue(store, stravaRefreshTokenAtom)).toBe('refresh-token-456')
    })

    it('should track Strava status', () => {
      expect(getAtomValue(store, stravaStatusAtom)).toBe('disconnected')

      setAtomValue(store, stravaStatusAtom, 'connecting')
      expect(getAtomValue(store, stravaStatusAtom)).toBe('connecting')

      setAtomValue(store, stravaStatusAtom, 'connected')
      expect(getAtomValue(store, stravaStatusAtom)).toBe('connected')
    })
  })

  describe('Sync state atoms', () => {
    it('should track sync in progress', () => {
      expect(getAtomValue(store, stravaSyncInProgressAtom)).toBe(false)

      setAtomValue(store, stravaSyncInProgressAtom, true)
      expect(getAtomValue(store, stravaSyncInProgressAtom)).toBe(true)
    })

    it('should track last sync time', () => {
      expect(getAtomValue(store, stravaLastSyncAtom)).toBe(null)

      const syncTime = '2024-01-01T10:00:00Z'
      setAtomValue(store, stravaLastSyncAtom, syncTime)
      expect(getAtomValue(store, stravaLastSyncAtom)).toBe(syncTime)
    })

    it('should track sync progress', () => {
      const initial = getAtomValue(store, stravaSyncProgressAtom)
      expect(initial).toEqual({
        current: 0,
        total: 0,
        message: '',
      })

      setAtomValue(store, stravaSyncProgressAtom, {
        current: 5,
        total: 10,
        message: 'Syncing activities...',
      })

      expect(getAtomValue(store, stravaSyncProgressAtom)).toEqual({
        current: 5,
        total: 10,
        message: 'Syncing activities...',
      })
    })

    it('should track detailed sync progress', () => {
      expect(getAtomValue(store, syncProgressAtom)).toEqual({})

      setAtomValue(store, syncProgressAtom, {
        total: 20,
        synced: 15,
        failed: 2,
        status: 'syncing',
        message: 'Processing activities...',
      })

      const progress = getAtomValue(store, syncProgressAtom)
      expect(progress.total).toBe(20)
      expect(progress.synced).toBe(15)
      expect(progress.failed).toBe(2)
      expect(progress.status).toBe('syncing')
    })
  })

  describe('UI state atoms', () => {
    it('should track panel visibility', () => {
      expect(getAtomValue(store, workoutStravaShowPanelAtom)).toBe(false)

      setAtomValue(store, workoutStravaShowPanelAtom, true)
      expect(getAtomValue(store, workoutStravaShowPanelAtom)).toBe(true)
    })

    it('should track selected activities', () => {
      expect(getAtomValue(store, stravaSelectedActivitiesAtom)).toEqual([])

      setAtomValue(store, stravaSelectedActivitiesAtom, ['activity-1', 'activity-2'])
      expect(getAtomValue(store, stravaSelectedActivitiesAtom)).toEqual([
        'activity-1',
        'activity-2',
      ])
    })
  })

  describe('Auto-reconnect state', () => {
    it('should track auto-reconnect configuration', () => {
      const initial = getAtomValue(store, stravaAutoReconnectAtom)
      expect(initial).toEqual({
        enabled: false,
        attempts: 0,
        maxAttempts: 3,
        lastAttempt: null,
      })

      const now = new Date()
      setAtomValue(store, stravaAutoReconnectAtom, {
        enabled: true,
        attempts: 1,
        maxAttempts: 3,
        lastAttempt: now,
      })

      const state = getAtomValue(store, stravaAutoReconnectAtom)
      expect(state.enabled).toBe(true)
      expect(state.attempts).toBe(1)
      expect(state.lastAttempt).toBe(now)
    })
  })

  describe('Strava connection', () => {
    it('should track connection details', () => {
      expect(getAtomValue(store, stravaConnectionAtom)).toBe(null)

      const connection = {
        id: 'conn-1',
        athlete_id: 123456,
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_at: '2024-12-31T23:59:59Z',
      } as any

      setAtomValue(store, stravaConnectionAtom, connection)
      expect(getAtomValue(store, stravaConnectionAtom)).toEqual(connection)
    })
  })

  describe('Derived atoms', () => {
    it('should compute sync stats', () => {
      setAtomValue(store, syncProgressAtom, {
        totalActivities: 50,
        syncedActivities: 45,
        pendingActivities: 5,
      })

      const stats = getAtomValue(store, syncStatsAtom)
      expect(stats.totalActivities).toBe(50)
      expect(stats.syncedActivities).toBe(45)
      expect(stats.pendingActivities).toBe(5)
      // Check aliases
      expect(stats.total).toBe(50)
      expect(stats.synced).toBe(45)
      expect(stats.pending).toBe(5)
    })

    it('should compute complete Strava state', () => {
      // Set up various atom states
      setAtomValue(store, stravaStatusAtom, 'connected')
      setAtomValue(store, stravaConnectionAtom, {
        id: 'conn-1',
        athlete_id: 123456,
      } as any)
      setAtomValue(store, stravaActivitiesAtom, [{ id: 'a1', name: 'Run' } as any])
      setAtomValue(store, syncProgressAtom, {
        totalActivities: 10,
        syncedActivities: 8,
        pendingActivities: 2,
      })
      setAtomValue(store, stravaLoadingAtom, false)

      const state = getAtomValue(store, stravaStateAtom)

      expect(state.status).toBe('connected')
      expect(state.isConnected).toBe(true)
      expect(state.canSync).toBe(true)
      expect(state.needsReconnect).toBe(false)
      expect(state.activities).toHaveLength(1)
      expect(state.syncStats.total).toBe(10)
      expect(state.loading).toBe(false)
    })
  })

  describe('Strava actions', () => {
    it('should handle connect action', async () => {
      await store.set(stravaActionsAtom, {
        type: 'CONNECT',
      })

      expect(getAtomValue(store, stravaStatusAtom)).toBe('connecting')
    })

    it('should handle disconnect action', async () => {
      // Set up connected state
      setAtomValue(store, stravaStatusAtom, 'connected')
      setAtomValue(store, stravaConnectionAtom, { id: 'conn-1' } as any)
      setAtomValue(store, stravaActivitiesAtom, [{ id: 'a1' } as any])

      await store.set(stravaActionsAtom, {
        type: 'DISCONNECT',
      })

      expect(getAtomValue(store, stravaStatusAtom)).toBe('disconnected')
      expect(getAtomValue(store, stravaConnectionAtom)).toBe(null)
      expect(getAtomValue(store, stravaActivitiesAtom)).toEqual([])
    })
  })

  describe('Matching summary', () => {
    it('should track workout matching summary', () => {
      const initial = getAtomValue(store, matchingSummaryAtom)
      expect(initial).toEqual({
        matched: 0,
        unmatched: 0,
        suggestions: 0,
        byType: {},
        unmatchedWorkouts: [],
        lastProcessed: null,
      })

      const summary = {
        matched: 10,
        unmatched: 5,
        suggestions: 3,
        byType: {
          long_run: { matched: 5, unmatched: 2, suggestions: 1 },
          interval: { matched: 5, unmatched: 3, suggestions: 2 },
        },
        unmatchedWorkouts: [{ id: 'w1' } as any],
        lastProcessed: new Date(),
      }

      setAtomValue(store, matchingSummaryAtom, summary)

      const result = getAtomValue(store, matchingSummaryAtom)
      expect(result.matched).toBe(10)
      expect(result.unmatched).toBe(5)
      expect(result.suggestions).toBe(3)
      expect(result.byType?.long_run?.matched).toBe(5)
      expect(result.unmatchedWorkouts).toHaveLength(1)
    })
  })

  describe('Complex scenarios', () => {
    it('should handle complete sync workflow', () => {
      // Start sync
      setAtomValue(store, stravaSyncInProgressAtom, true)
      setAtomValue(store, stravaSyncProgressAtom, {
        current: 0,
        total: 100,
        message: 'Starting sync...',
      })

      // Update progress
      setAtomValue(store, stravaSyncProgressAtom, {
        current: 50,
        total: 100,
        message: 'Syncing activities...',
      })

      // Complete sync
      setAtomValue(store, stravaSyncInProgressAtom, false)
      setAtomValue(store, stravaSyncProgressAtom, {
        current: 100,
        total: 100,
        message: 'Sync completed!',
      })
      setAtomValue(store, stravaLastSyncAtom, new Date().toISOString())

      // Verify final state
      expect(getAtomValue(store, stravaSyncInProgressAtom)).toBe(false)
      expect(getAtomValue(store, stravaSyncProgressAtom).current).toBe(100)
      expect(getAtomValue(store, stravaLastSyncAtom)).toBeTruthy()
    })

    it('should handle connection failure and retry', () => {
      // Initial connection attempt
      setAtomValue(store, stravaStatusAtom, 'connecting')

      // Connection fails
      setAtomValue(store, stravaStatusAtom, 'error')
      setAtomValue(store, stravaErrorAtom, 'Connection failed')

      // Update auto-reconnect state
      const autoReconnect = getAtomValue(store, stravaAutoReconnectAtom)
      setAtomValue(store, stravaAutoReconnectAtom, {
        ...autoReconnect,
        enabled: true,
        attempts: 1,
        lastAttempt: new Date(),
      })

      // Retry connection
      setAtomValue(store, stravaStatusAtom, 'connecting')
      setAtomValue(store, stravaErrorAtom, null)

      // Successful connection
      setAtomValue(store, stravaStatusAtom, 'connected')
      setAtomValue(store, stravaAutoReconnectAtom, {
        ...autoReconnect,
        attempts: 0,
        lastAttempt: null,
      })

      // Verify final state
      expect(getAtomValue(store, stravaStatusAtom)).toBe('connected')
      expect(getAtomValue(store, stravaErrorAtom)).toBe(null)
      expect(getAtomValue(store, stravaAutoReconnectAtom).attempts).toBe(0)
    })
  })
})
