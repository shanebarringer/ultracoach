import { createStore } from 'jotai'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { completeWorkoutAtom, logWorkoutDetailsAtom, skipWorkoutAtom } from '../atoms'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('Workout Completion Atoms', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
    vi.clearAllMocks()
  })

  describe('completeWorkoutAtom', () => {
    it('should make POST request to complete workout endpoint', async () => {
      const mockResponse = {
        id: 'workout-123',
        status: 'completed',
        updated_at: new Date().toISOString(),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await store.set(completeWorkoutAtom, {
        workoutId: 'workout-123',
        data: { actual_distance: 5.2 },
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/workouts/workout-123/complete',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ actual_distance: 5.2 }),
        }
      )
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
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await store.set(logWorkoutDetailsAtom, {
        workoutId: 'workout-456',
        data: workoutData,
      })

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/workouts/workout-456/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/workouts/workout-789/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await store.set(skipWorkoutAtom, 'workout-999')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/workouts/workout-999/complete',
        {
          method: 'DELETE',
        }
      )
    })

    it('should handle skip workout errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      })

      await expect(store.set(skipWorkoutAtom, 'workout-999')).rejects.toThrow(
        'Failed to skip workout'
      )
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

        expect(fetch).toHaveBeenCalledWith(
          `http://localhost:3000/api/workouts/${workoutId}/complete`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          }
        )
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

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/workouts/workout-empty/complete',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      )
    })
  })
})
