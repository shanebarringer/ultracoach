/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Workouts Atoms Unit Tests
 *
 * Tests the workout-related atoms from the actual implementation
 */
import { createStore } from 'jotai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  completeWorkoutAtom,
  editingWorkoutIdAtom,
  isEditingWorkoutAtom,
  logWorkoutDetailsAtom,
  selectedMatchAtom,
  selectedWorkoutAtom,
  selectedWorkoutIdAtom,
  showWorkoutDiffModalAtom,
  skipWorkoutAtom,
  workoutAnalyticsAtom,
  workoutFormDataAtom,
  workoutLookupMapAtom,
  workoutQuickFilterAtom,
  workoutSearchTermAtom,
  workoutSortByAtom,
  workoutStatusFilterAtom,
  workoutTypeFilterAtom,
  workoutViewModeAtom,
  workoutsAtom,
  workoutsRefreshTriggerAtom,
} from '@/lib/atoms/workouts'

import {
  createMockWorkout,
  createTestStore,
  getAtomValue,
  setAtomValue,
} from './utils/test-helpers'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

// Mock Better Auth client
const mockGetSession = vi.fn()
vi.mock('@/lib/better-auth-client', () => ({
  authClient: {
    getSession: mockGetSession,
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('Workouts Atoms', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createTestStore()
    vi.clearAllMocks()

    // Mock authenticated session
    mockGetSession.mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Core workout atoms', () => {
    it('should have empty array as initial value for workoutsAtom', () => {
      const workouts = getAtomValue(store, workoutsAtom)
      expect(workouts).toEqual([])
    })

    it('should store workouts', () => {
      const mockWorkouts = [
        createMockWorkout({ id: 'w1', name: 'Morning Run' }),
        createMockWorkout({ id: 'w2', name: 'Afternoon Workout' }),
      ]

      setAtomValue(store, workoutsAtom, mockWorkouts)

      const workouts = getAtomValue(store, workoutsAtom)
      expect(workouts).toHaveLength(2)
      expect(workouts[0].name).toBe('Morning Run')
      expect(workouts[1].name).toBe('Afternoon Workout')
    })

    it('should track refresh trigger', () => {
      const initialValue = getAtomValue(store, workoutsRefreshTriggerAtom)
      expect(initialValue).toBe(0)

      setAtomValue(store, workoutsRefreshTriggerAtom, Date.now())
      expect(getAtomValue(store, workoutsRefreshTriggerAtom)).toBeGreaterThan(initialValue)
    })
  })

  describe('Selection atoms', () => {
    it('should track selected workout', () => {
      const workout = createMockWorkout({ id: 'w1' })

      expect(getAtomValue(store, selectedWorkoutAtom)).toBe(null)

      setAtomValue(store, selectedWorkoutAtom, workout)
      expect(getAtomValue(store, selectedWorkoutAtom)).toBe(workout)
    })

    it('should track selected workout ID', () => {
      expect(getAtomValue(store, selectedWorkoutIdAtom)).toBe(null)

      setAtomValue(store, selectedWorkoutIdAtom, 'w1')
      expect(getAtomValue(store, selectedWorkoutIdAtom)).toBe('w1')
    })
  })

  describe('Filter atoms', () => {
    it('should track search term', () => {
      expect(getAtomValue(store, workoutSearchTermAtom)).toBe('')

      setAtomValue(store, workoutSearchTermAtom, 'long run')
      expect(getAtomValue(store, workoutSearchTermAtom)).toBe('long run')
    })

    it('should track type filter', () => {
      expect(getAtomValue(store, workoutTypeFilterAtom)).toBe('all')

      setAtomValue(store, workoutTypeFilterAtom, 'long_run')
      expect(getAtomValue(store, workoutTypeFilterAtom)).toBe('long_run')
    })

    it('should track status filter', () => {
      expect(getAtomValue(store, workoutStatusFilterAtom)).toBe('all')

      setAtomValue(store, workoutStatusFilterAtom, 'completed')
      expect(getAtomValue(store, workoutStatusFilterAtom)).toBe('completed')
    })

    it('should track sort order', () => {
      expect(getAtomValue(store, workoutSortByAtom)).toBe('date-desc')

      setAtomValue(store, workoutSortByAtom, 'date-asc')
      expect(getAtomValue(store, workoutSortByAtom)).toBe('date-asc')
    })

    it('should track view mode', () => {
      expect(getAtomValue(store, workoutViewModeAtom)).toBe('grid')

      setAtomValue(store, workoutViewModeAtom, 'list')
      expect(getAtomValue(store, workoutViewModeAtom)).toBe('list')
    })

    it('should track quick filter', () => {
      expect(getAtomValue(store, workoutQuickFilterAtom)).toBe('all')

      setAtomValue(store, workoutQuickFilterAtom, 'today')
      expect(getAtomValue(store, workoutQuickFilterAtom)).toBe('today')
    })
  })

  describe('Form atoms', () => {
    it('should track form data', () => {
      const formData = {
        name: 'New Workout',
        type: 'long_run',
        distance: 10,
      }

      expect(getAtomValue(store, workoutFormDataAtom)).toEqual({})

      setAtomValue(store, workoutFormDataAtom, formData)
      expect(getAtomValue(store, workoutFormDataAtom)).toEqual(formData)
    })

    it('should track editing state', () => {
      expect(getAtomValue(store, isEditingWorkoutAtom)).toBe(false)

      setAtomValue(store, isEditingWorkoutAtom, true)
      expect(getAtomValue(store, isEditingWorkoutAtom)).toBe(true)
    })

    it('should track editing workout ID', () => {
      expect(getAtomValue(store, editingWorkoutIdAtom)).toBe(null)

      setAtomValue(store, editingWorkoutIdAtom, 'w1')
      expect(getAtomValue(store, editingWorkoutIdAtom)).toBe('w1')
    })
  })

  describe('Derived atoms', () => {
    it('should create workout lookup map', () => {
      const workouts = [
        createMockWorkout({ id: 'w1', name: 'Workout 1' }),
        createMockWorkout({ id: 'w2', name: 'Workout 2' }),
        createMockWorkout({ id: 'w3', name: 'Workout 3' }),
      ]

      setAtomValue(store, workoutsAtom, workouts)

      const lookupMap = getAtomValue(store, workoutLookupMapAtom)
      expect(lookupMap).toBeInstanceOf(Map)
      expect(lookupMap.size).toBe(3)
      expect(lookupMap.get('w1')?.name).toBe('Workout 1')
      expect(lookupMap.get('w2')?.name).toBe('Workout 2')
      expect(lookupMap.get('w3')?.name).toBe('Workout 3')
    })
  })

  describe('Workout diff modal atoms', () => {
    it('should track selected match', () => {
      const match = {
        plannedWorkout: createMockWorkout({ id: 'p1' }),
        stravaActivity: { id: 's1', name: 'Activity' } as any,
        confidence: 0.95,
        discrepancies: [],
      }

      expect(getAtomValue(store, selectedMatchAtom)).toBe(null)

      setAtomValue(store, selectedMatchAtom, match)
      expect(getAtomValue(store, selectedMatchAtom)).toBe(match)
    })

    it('should track modal visibility', () => {
      expect(getAtomValue(store, showWorkoutDiffModalAtom)).toBe(false)

      setAtomValue(store, showWorkoutDiffModalAtom, true)
      expect(getAtomValue(store, showWorkoutDiffModalAtom)).toBe(true)
    })
  })

  describe('Analytics atom', () => {
    it('should track workout analytics', () => {
      const analytics = {
        completionRate: 85,
        streak: {
          current: 5,
          longest: 10,
        },
        thisWeek: {
          planned: 4,
          completed: 3,
        },
        thisMonth: {
          planned: 20,
          completed: 17,
        },
      }

      setAtomValue(store, workoutAnalyticsAtom, analytics)
      expect(getAtomValue(store, workoutAnalyticsAtom)).toEqual(analytics)
    })
  })

  describe('Action atoms', () => {
    beforeEach(() => {
      const existingWorkout = createMockWorkout({
        id: 'w1',
        status: 'planned',
      })
      setAtomValue(store, workoutsAtom, [existingWorkout])
    })

    describe('completeWorkoutAtom', () => {
      it('should mark workout as completed', async () => {
        const mockResponse = {
          id: 'w1',
          status: 'completed',
          completed_at: new Date().toISOString(),
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })

        const result = await store.set(completeWorkoutAtom, {
          workoutId: 'w1',
          data: {
            actual_distance: 10.5,
            actual_duration: 65,
            notes: 'Felt good!',
          },
        })

        expect(fetch).toHaveBeenCalledWith('/api/workouts/w1/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            actual_distance: 10.5,
            actual_duration: 65,
            notes: 'Felt good!',
          }),
        })

        expect(result.status).toBe('completed')

        const workouts = getAtomValue(store, workoutsAtom)
        expect(workouts[0].status).toBe('completed')
      })

      it('should handle completion errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          text: async () => 'Not Found',
        })

        await expect(store.set(completeWorkoutAtom, { workoutId: 'w1' })).rejects.toThrow(
          'Failed to complete workout'
        )
      })
    })

    describe('logWorkoutDetailsAtom', () => {
      it('should log workout details', async () => {
        const workoutData = {
          actual_distance: 12,
          actual_duration: 70,
          notes: 'Great workout!',
          perceived_effort: 7,
        }

        const mockResponse = {
          id: 'w1',
          actual_distance: 12,
          actual_duration: 70,
          notes: 'Great workout!',
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })

        const result = await store.set(logWorkoutDetailsAtom, {
          workoutId: 'w1',
          data: workoutData,
        })

        expect(fetch).toHaveBeenCalledWith('/api/workouts/w1/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(workoutData),
        })

        expect(result.actual_distance).toBe(12)

        const workouts = getAtomValue(store, workoutsAtom)
        expect(workouts[0].actual_distance).toBe(12)
      })
    })

    describe('skipWorkoutAtom', () => {
      it('should skip workout', async () => {
        const mockResponse = {
          id: 'w1',
          status: 'skipped',
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })

        const result = await store.set(skipWorkoutAtom, 'w1')

        expect(fetch).toHaveBeenCalledWith('/api/workouts/w1/complete', {
          method: 'DELETE',
          credentials: 'same-origin',
        })

        expect(result.status).toBe('skipped')

        const workouts = getAtomValue(store, workoutsAtom)
        expect(workouts[0].status).toBe('skipped')
      })
    })
  })
})
