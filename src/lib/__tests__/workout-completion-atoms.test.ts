import { createStore } from 'jotai'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { completeWorkoutAtom, logWorkoutDetailsAtom, skipWorkoutAtom, workoutsAtom } from '../atoms'
import {
  createMockAxiosError,
  createMockAxiosResponse,
  setupAuthenticatedMocks,
  setupUnauthenticatedMocks,
} from '../atoms/__tests__/utils/test-helpers'

// Mock the api-client module - workout action atoms use axios, not fetch
const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  api: mockApi,
}))

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

describe('Workout Completion Atoms', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
    vi.clearAllMocks()

    // Mock authenticated session using helper
    setupAuthenticatedMocks(mockGetSession)
  })

  describe('completeWorkoutAtom', () => {
    it('should make POST request to complete workout endpoint', async () => {
      const mockResponse = {
        id: 'workout-123',
        status: 'completed',
        updated_at: new Date().toISOString(),
      }

      mockApi.post.mockResolvedValueOnce(createMockAxiosResponse(mockResponse))

      await store.set(completeWorkoutAtom, {
        workoutId: 'workout-123',
        data: { actual_distance: 5.2 },
      })

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/workouts/workout-123/complete',
        { actual_distance: 5.2 },
        expect.any(Object)
      )
    })

    it('should handle network errors gracefully', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        store.set(completeWorkoutAtom, {
          workoutId: 'workout-123',
          data: {},
        })
      ).rejects.toThrow('Network error')
    })

    it('should handle API errors gracefully', async () => {
      mockApi.post.mockRejectedValueOnce(createMockAxiosError(404, { error: 'Not Found' }))

      await expect(
        store.set(completeWorkoutAtom, {
          workoutId: 'workout-123',
          data: {},
        })
      ).rejects.toThrow('Request failed')
    })
  })

  describe('logWorkoutDetailsAtom', () => {
    it('should make PUT request to log workout details endpoint', async () => {
      const workoutData = {
        actual_distance: 8.2,
        actual_duration: 58,
        intensity: 7,
        workout_notes: 'Great tempo run!',
      }

      const mockResponse = {
        id: 'workout-456',
        status: 'completed',
        ...workoutData,
        updated_at: new Date().toISOString(),
      }

      mockApi.put.mockResolvedValueOnce(createMockAxiosResponse(mockResponse))

      await store.set(logWorkoutDetailsAtom, {
        workoutId: 'workout-456',
        data: workoutData,
      })

      expect(mockApi.put).toHaveBeenCalledWith(
        '/api/workouts/workout-456/log',
        workoutData,
        expect.any(Object)
      )
    })

    it('should handle comprehensive workout data', async () => {
      const comprehensiveData = {
        status: 'completed',
        actual_distance: 15.5,
        actual_duration: 125,
        actual_type: 'long_run',
        intensity: 6,
        terrain: 'trail',
        elevation_gain: 1200,
        workout_notes: 'Challenging trail run with significant elevation',
        injury_notes: 'Minor knee discomfort at mile 12',
      }

      mockApi.put.mockResolvedValueOnce(
        createMockAxiosResponse({ id: 'workout-789', ...comprehensiveData })
      )

      await store.set(logWorkoutDetailsAtom, {
        workoutId: 'workout-789',
        data: comprehensiveData,
      })

      expect(mockApi.put).toHaveBeenCalledWith(
        '/api/workouts/workout-789/log',
        comprehensiveData,
        expect.any(Object)
      )
    })
  })

  describe('skipWorkoutAtom', () => {
    it('should make DELETE request to skip workout', async () => {
      const mockResponse = {
        id: 'workout-999',
        status: 'skipped',
        updated_at: new Date().toISOString(),
      }

      mockApi.delete.mockResolvedValueOnce(createMockAxiosResponse(mockResponse))

      await store.set(skipWorkoutAtom, 'workout-999')

      expect(mockApi.delete).toHaveBeenCalledWith(
        '/api/workouts/workout-999/complete',
        expect.any(Object)
      )
    })

    it('should handle skip workout errors', async () => {
      mockApi.delete.mockRejectedValueOnce(createMockAxiosError(403, { error: 'Forbidden' }))

      await expect(store.set(skipWorkoutAtom, 'workout-999')).rejects.toThrow('Request failed')
    })
  })

  describe('Unauthenticated scenarios', () => {
    beforeEach(() => {
      // Mock unauthenticated session using helper
      setupUnauthenticatedMocks(mockGetSession)
    })

    it('should handle unauthenticated complete workout request', async () => {
      await expect(
        store.set(completeWorkoutAtom, {
          workoutId: 'workout-123',
          data: {},
        })
      ).rejects.toThrow('Not authenticated')
    })

    it('should handle unauthenticated log workout details request', async () => {
      await expect(
        store.set(logWorkoutDetailsAtom, {
          workoutId: 'workout-456',
          data: { actual_distance: 5 },
        })
      ).rejects.toThrow('Not authenticated')
    })

    it('should handle unauthenticated skip workout request', async () => {
      await expect(store.set(skipWorkoutAtom, 'workout-999')).rejects.toThrow('Not authenticated')
    })
  })

  describe('Atom Integration', () => {
    it('should work with different workout IDs', async () => {
      const workoutIds = ['uuid-1', 'uuid-2', 'uuid-3']

      for (const workoutId of workoutIds) {
        mockApi.post.mockResolvedValueOnce(
          createMockAxiosResponse({ id: workoutId, status: 'completed' })
        )

        await store.set(completeWorkoutAtom, { workoutId, data: {} })

        expect(mockApi.post).toHaveBeenCalledWith(
          `/api/workouts/${workoutId}/complete`,
          {},
          expect.any(Object)
        )
      }
    })

    it('should handle empty data objects', async () => {
      mockApi.post.mockResolvedValueOnce(
        createMockAxiosResponse({ id: 'workout-empty', status: 'completed' })
      )

      await store.set(completeWorkoutAtom, {
        workoutId: 'workout-empty',
        data: {},
      })

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/workouts/workout-empty/complete',
        {},
        expect.any(Object)
      )
    })
  })

  describe('204 No Content Response Handling', () => {
    // Note: Only skipWorkoutAtom has explicit 204 handling in the implementation.
    // completeWorkoutAtom and logWorkoutDetailsAtom don't have 204 handling.
    describe('skipWorkoutAtom - 204 Success Case', () => {
      beforeEach(() => {
        // Set up workout in local state for successful tests
        const mockWorkout = {
          id: 'workout-123',
          user_id: 'test-user-id',
          training_plan_id: null,
          date: new Date().toISOString(),
          type: 'long_run',
          planned_type: 'long_run',
          name: 'Test Long Run',
          description: 'Test workout description',
          distance: 20,
          duration: 180,
          intensity: 5,
          status: 'planned',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        store.set(workoutsAtom, [mockWorkout])
      })

      it('should handle 204 response from skipWorkoutAtom when workout exists locally', async () => {
        // Mock 204 No Content response using axios shape
        mockApi.delete.mockResolvedValueOnce({
          data: null,
          status: 204,
          statusText: 'No Content',
          headers: {},
          config: { headers: {} },
        })

        await store.set(skipWorkoutAtom, 'workout-123')

        expect(mockApi.delete).toHaveBeenCalledWith(
          '/api/workouts/workout-123/complete',
          expect.any(Object)
        )

        // Check that workout was updated in local state
        const workouts = store.get(workoutsAtom)
        const updatedWorkout = workouts.find(w => w.id === 'workout-123')
        expect(updatedWorkout?.status).toBe('skipped')
      })
    })

    describe('skipWorkoutAtom - 204 Failure Case', () => {
      beforeEach(() => {
        // Set up empty local state for failure tests
        store.set(workoutsAtom, [])
      })

      it('should throw error when skipWorkoutAtom gets 204 but workout not found locally', async () => {
        // Mock 204 No Content response using axios shape
        mockApi.delete.mockResolvedValueOnce({
          data: null,
          status: 204,
          statusText: 'No Content',
          headers: {},
          config: { headers: {} },
        })

        await expect(store.set(skipWorkoutAtom, 'workout-999')).rejects.toThrow(
          'Workout workout-999 not found in local state. Please refresh the page.'
        )
      })
    })
  })
})
