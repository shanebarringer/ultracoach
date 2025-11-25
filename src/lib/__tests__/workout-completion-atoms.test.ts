import { createStore } from 'jotai'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { completeWorkoutAtom, logWorkoutDetailsAtom, skipWorkoutAtom, workoutsAtom } from '../atoms'
import {
  createMockFetchError,
  createMockFetchResponse,
  setupAuthenticatedMocks,
  setupUnauthenticatedMocks,
} from '../atoms/__tests__/utils/test-helpers'

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

      mockFetch.mockResolvedValueOnce(createMockFetchResponse(mockResponse))

      await store.set(completeWorkoutAtom, {
        workoutId: 'workout-123',
        data: { actual_distance: 5.2 },
      })

      expect(fetch).toHaveBeenCalledWith('/api/workouts/workout-123/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ actual_distance: 5.2 }),
      })
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        store.set(completeWorkoutAtom, {
          workoutId: 'workout-123',
          data: {},
        })
      ).rejects.toThrow('Network error')
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce(createMockFetchError(404, 'Not Found'))

      await expect(
        store.set(completeWorkoutAtom, {
          workoutId: 'workout-123',
          data: {},
        })
      ).rejects.toThrow('Failed to complete workout')
    })
  })

  describe('logWorkoutDetailsAtom', () => {
    it('should make POST request to log workout details endpoint', async () => {
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

      mockFetch.mockResolvedValueOnce(createMockFetchResponse(mockResponse))

      await store.set(logWorkoutDetailsAtom, {
        workoutId: 'workout-456',
        data: workoutData,
      })

      expect(fetch).toHaveBeenCalledWith('/api/workouts/workout-456/log', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(workoutData),
      })
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'workout-789', ...comprehensiveData }),
      })

      await store.set(logWorkoutDetailsAtom, {
        workoutId: 'workout-789',
        data: comprehensiveData,
      })

      expect(fetch).toHaveBeenCalledWith('/api/workouts/workout-789/log', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(comprehensiveData),
      })
    })
  })

  describe('skipWorkoutAtom', () => {
    it('should make DELETE request to skip workout', async () => {
      const mockResponse = {
        id: 'workout-999',
        status: 'skipped',
        updated_at: new Date().toISOString(),
      }

      mockFetch.mockResolvedValueOnce(createMockFetchResponse(mockResponse))

      await store.set(skipWorkoutAtom, 'workout-999')

      expect(fetch).toHaveBeenCalledWith('/api/workouts/workout-999/complete', {
        method: 'DELETE',
        credentials: 'same-origin',
      })
    })

    it('should handle skip workout errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockFetchError(403, 'Forbidden'))

      await expect(store.set(skipWorkoutAtom, 'workout-999')).rejects.toThrow(
        'Failed to skip workout'
      )
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
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: workoutId, status: 'completed' }),
        })

        await store.set(completeWorkoutAtom, { workoutId, data: {} })

        expect(fetch).toHaveBeenCalledWith(`/api/workouts/${workoutId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({}),
        })
      }
    })

    it('should handle empty data objects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'workout-empty', status: 'completed' }),
      })

      await store.set(completeWorkoutAtom, {
        workoutId: 'workout-empty',
        data: {},
      })

      expect(fetch).toHaveBeenCalledWith('/api/workouts/workout-empty/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({}),
      })
    })
  })

  describe('204 No Content Response Handling', () => {
    describe('Success Cases - Workout Exists Locally', () => {
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

      it('should handle 204 response from completeWorkoutAtom when workout exists locally', async () => {
        // Mock 204 No Content response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 204,
          statusText: 'No Content',
          json: async () => {
            throw new Error('204 responses have no content')
          },
        })

        await store.set(completeWorkoutAtom, {
          workoutId: 'workout-123',
          data: { actual_distance: 5.2 },
        })

        expect(fetch).toHaveBeenCalledWith('/api/workouts/workout-123/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ actual_distance: 5.2 }),
        })

        // Check that workout was updated in local state
        const workouts = store.get(workoutsAtom)
        const updatedWorkout = workouts.find(w => w.id === 'workout-123')
        expect(updatedWorkout?.status).toBe('completed')
        expect(updatedWorkout?.actual_distance).toBe(5.2)
      })

      it('should handle 204 response from logWorkoutDetailsAtom when workout exists locally', async () => {
        // Mock 204 No Content response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 204,
          statusText: 'No Content',
          json: async () => {
            throw new Error('204 responses have no content')
          },
        })

        const workoutData = {
          actual_distance: 8.2,
          actual_duration: 58,
          intensity: 7,
          workout_notes: 'Great tempo run!',
        }

        await store.set(logWorkoutDetailsAtom, {
          workoutId: 'workout-123',
          data: workoutData,
        })

        expect(fetch).toHaveBeenCalledWith('/api/workouts/workout-123/log', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(workoutData),
        })

        // Check that workout was updated in local state
        const workouts = store.get(workoutsAtom)
        const updatedWorkout = workouts.find(w => w.id === 'workout-123')
        expect(updatedWorkout?.actual_distance).toBe(8.2)
        expect(updatedWorkout?.actual_duration).toBe(58)
        expect(updatedWorkout?.intensity).toBe(7)
        expect(updatedWorkout?.workout_notes).toBe('Great tempo run!')
      })

      it('should handle 204 response from skipWorkoutAtom when workout exists locally', async () => {
        // Mock 204 No Content response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 204,
          statusText: 'No Content',
          json: async () => {
            throw new Error('204 responses have no content')
          },
        })

        await store.set(skipWorkoutAtom, 'workout-123')

        expect(fetch).toHaveBeenCalledWith('/api/workouts/workout-123/complete', {
          method: 'DELETE',
          credentials: 'same-origin',
        })

        // Check that workout was updated in local state
        const workouts = store.get(workoutsAtom)
        const updatedWorkout = workouts.find(w => w.id === 'workout-123')
        expect(updatedWorkout?.status).toBe('skipped')
      })
    })

    describe('Failure Cases - Workout Not Found Locally', () => {
      beforeEach(() => {
        // Set up empty local state for failure tests
        store.set(workoutsAtom, [])
      })

      it('should throw error when completeWorkoutAtom gets 204 but workout not found locally', async () => {
        // Mock 204 No Content response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 204,
          statusText: 'No Content',
          json: async () => {
            throw new Error('204 responses have no content')
          },
        })

        await expect(
          store.set(completeWorkoutAtom, {
            workoutId: 'workout-999',
            data: { actual_distance: 5.2 },
          })
        ).rejects.toThrow('Workout workout-999 not found in local state. Please refresh the page.')
      })

      it('should throw error when logWorkoutDetailsAtom gets 204 but workout not found locally', async () => {
        // Mock 204 No Content response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 204,
          statusText: 'No Content',
          json: async () => {
            throw new Error('204 responses have no content')
          },
        })

        await expect(
          store.set(logWorkoutDetailsAtom, {
            workoutId: 'workout-999',
            data: { actual_distance: 8.2 },
          })
        ).rejects.toThrow('Workout workout-999 not found in local state. Please refresh the page.')
      })

      it('should throw error when skipWorkoutAtom gets 204 but workout not found locally', async () => {
        // Mock 204 No Content response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 204,
          statusText: 'No Content',
          json: async () => {
            throw new Error('204 responses have no content')
          },
        })

        await expect(store.set(skipWorkoutAtom, 'workout-999')).rejects.toThrow(
          'Workout workout-999 not found in local state. Please refresh the page.'
        )
      })
    })
  })
})
