/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Workouts Atoms Unit Tests
 *
 * Tests the workout-related atoms from the actual implementation
 *
 * NOTE: Mocks for @/lib/api-client, @/lib/logger, and @/lib/better-auth-client
 * are defined globally in src/test/setup.ts to ensure they're registered before
 * any dynamic imports occur. This is critical because the workout action atoms
 * use dynamic imports (`await import('@/lib/api-client')`).
 */
import { addDays, format } from 'date-fns'
import { createStore } from 'jotai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api-client'
import { completedWorkoutsAtom, thisWeeksWorkoutsAtom, todaysWorkoutsAtom } from '@/lib/atoms/index'
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
import { getWeekRange } from '@/lib/utils/date'

import {
  createMockAxiosResponse,
  createMockWorkout,
  createTestStore,
  getAtomValue,
  setAtomValue,
} from './utils/test-helpers'

// Get reference to the mocked api from the global setup
// The api-client mock is defined in src/test/setup.ts to handle dynamic imports properly
const mockApi = vi.mocked(api)

// Mock Better Auth client - defined locally since it doesn't have dynamic import issues
const mockGetSession = vi.fn()
vi.mock('@/lib/better-auth-client', () => ({
  authClient: {
    getSession: mockGetSession,
  },
}))

describe('Workouts Atoms', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    // Set consistent time and timezone for date-dependent tests to prevent flakiness
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))

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
    vi.useRealTimers()
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

    it('should sort completed workouts newest-first with created_at tie-breaker', () => {
      const sameDate = format(new Date(), 'yyyy-MM-dd')
      const w1 = createMockWorkout({
        id: 'w1',
        status: 'completed',
        date: sameDate,
        created_at: new Date('2025-01-01T10:00:00Z').toISOString(),
      })
      const w2 = createMockWorkout({
        id: 'w2',
        status: 'completed',
        date: sameDate,
        created_at: new Date('2025-01-01T12:00:00Z').toISOString(),
      })
      setAtomValue(store, workoutsAtom, [w1, w2])

      const sorted = getAtomValue(store, completedWorkoutsAtom)
      expect(sorted.map(w => w.id)).toEqual(['w2', 'w1'])
    })

    it('should filter todaysWorkoutsAtom using date-fns parsing', () => {
      const today = new Date()
      const todayYMD = format(today, 'yyyy-MM-dd')
      const yesterday = format(addDays(today, -1), 'yyyy-MM-dd')
      const tomorrow = format(addDays(today, 1), 'yyyy-MM-dd')

      const workouts = [
        createMockWorkout({ id: 't1', date: todayYMD }),
        createMockWorkout({ id: 't2', date: `${todayYMD}T08:00:00` }),
        createMockWorkout({ id: 'y1', date: yesterday }),
        createMockWorkout({ id: 'tm1', date: `${tomorrow}T12:00:00` }),
      ]

      setAtomValue(store, workoutsAtom, workouts)
      const todays = getAtomValue(store, todaysWorkoutsAtom)
      const ids = todays.map(w => w.id)
      expect(ids).toContain('t1')
      expect(ids).toContain('t2')
      expect(ids).not.toContain('y1')
      expect(ids).not.toContain('tm1')
    })

    it('should filter thisWeeksWorkoutsAtom within week boundaries (Sun–Sat)', () => {
      const today = new Date()
      const { start, end } = getWeekRange(0, today) // Sunday start

      const before = format(addDays(start, -1), 'yyyy-MM-dd')
      const onStart = format(start, 'yyyy-MM-dd')
      const mid = format(addDays(start, 2), 'yyyy-MM-dd')
      const onEnd = format(end, 'yyyy-MM-dd')
      const after = format(addDays(end, 1), 'yyyy-MM-dd')

      const workouts = [
        createMockWorkout({ id: 'b', date: before }),
        createMockWorkout({ id: 's', date: onStart }),
        createMockWorkout({ id: 'm', date: mid }),
        createMockWorkout({ id: 'e', date: onEnd }),
        createMockWorkout({ id: 'a', date: after }),
      ]

      setAtomValue(store, workoutsAtom, workouts)
      const week = getAtomValue(store, thisWeeksWorkoutsAtom)
      const ids = week.map(w => w.id)
      expect(ids).toEqual(['s', 'm', 'e'])
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

        // Mock axios post for complete workout
        mockApi.post.mockResolvedValueOnce(createMockAxiosResponse(mockResponse))

        const result = await store.set(completeWorkoutAtom, {
          workoutId: 'w1',
          data: {
            actual_distance: 10.5,
            actual_duration: 65,
            notes: 'Felt good!',
          },
        })

        expect(mockApi.post).toHaveBeenCalledWith(
          '/api/workouts/w1/complete',
          {
            actual_distance: 10.5,
            actual_duration: 65,
            notes: 'Felt good!',
          },
          expect.any(Object)
        )

        expect(result.status).toBe('completed')

        const workouts = getAtomValue(store, workoutsAtom)
        expect(workouts[0].status).toBe('completed')
      })

      it('should handle completion errors', async () => {
        // Mock axios error for failed completion
        const axiosError = new Error('Failed to complete workout')
        ;(axiosError as any).isAxiosError = true
        ;(axiosError as any).response = { status: 404, statusText: 'Not Found' }
        mockApi.post.mockRejectedValueOnce(axiosError)

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

        // Mock axios put for log workout details
        mockApi.put.mockResolvedValueOnce(createMockAxiosResponse(mockResponse))

        const result = await store.set(logWorkoutDetailsAtom, {
          workoutId: 'w1',
          data: workoutData,
        })

        expect(mockApi.put).toHaveBeenCalledWith(
          '/api/workouts/w1/log',
          workoutData,
          expect.any(Object)
        )

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

        // Mock axios delete for skip workout
        mockApi.delete.mockResolvedValueOnce(createMockAxiosResponse(mockResponse))

        const result = await store.set(skipWorkoutAtom, 'w1')

        expect(mockApi.delete).toHaveBeenCalledWith('/api/workouts/w1/complete', expect.any(Object))

        expect(result.status).toBe('skipped')

        const workouts = getAtomValue(store, workoutsAtom)
        expect(workouts[0].status).toBe('skipped')
      })
    })
  })
})
