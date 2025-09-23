/**
 * Async Atoms Integration Tests
 *
 * Tests for async atoms with refresh patterns using proper Jotai testing utilities
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  availableCoachesAtom,
  availableRunnersAtom,
  connectedRunnersAtom,
} from '@/lib/atoms/relationships'
import { refreshableTrainingPlansAtom } from '@/lib/atoms/training-plans'
import { workoutsAtom } from '@/lib/atoms/workouts'

import { createTestStore } from './utils/test-helpers'

// Mock browser environment
Object.defineProperty(global, 'window', {
  value: { location: { href: 'http://localhost:3001' } },
  writable: true,
})

// Create mocks using vi.hoisted for proper hoisting support
const mocks = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
}))

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  api: {
    get: mocks.mockApiGet,
  },
}))

// Mock session for authenticated requests
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'user' as const,
    userType: 'coach' as const,
    name: 'Test User',
  },
}

// Mock the auth utilities
vi.mock('@/utils/auth-helpers', () => ({
  getClientSession: vi.fn(() => Promise.resolve(mockSession)),
}))

describe('Async Atoms Integration', () => {
  let store: ReturnType<typeof createTestStore>

  beforeEach(() => {
    store = createTestStore()
    mocks.mockApiGet.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Relationship Atoms', () => {
    describe('connectedRunnersAtom', () => {
      it('should fetch connected runners and return array', async () => {
        const mockRunners = [
          { id: '1', name: 'Runner 1', email: 'runner1@test.com', userType: 'runner' },
          { id: '2', name: 'Runner 2', email: 'runner2@test.com', userType: 'runner' },
        ]

        mocks.mockApiGet.mockResolvedValueOnce({
          data: mockRunners,
        })

        const runners = await store.get(connectedRunnersAtom)

        expect(runners).toHaveProperty('data')
        expect(Array.isArray(runners.data)).toBe(true)
        expect(runners.data).toHaveLength(2)
        expect(runners.data[0].name).toBe('Runner 1')
        expect(mocks.mockApiGet).toHaveBeenCalledWith(
          '/api/runners',
          expect.objectContaining({
            suppressGlobalToast: true,
          })
        )
      })

      it('should return empty array on API error', async () => {
        mocks.mockApiGet.mockRejectedValueOnce(new Error('API Error'))

        const runners = await store.get(connectedRunnersAtom)

        expect(runners).toHaveProperty('data')
        expect(Array.isArray(runners.data)).toBe(true)
        expect(runners.data).toEqual([])
      })

      it('should return empty array when API returns non-array', async () => {
        mocks.mockApiGet.mockResolvedValueOnce({
          data: null,
        })

        const runners = await store.get(connectedRunnersAtom)

        expect(runners).toHaveProperty('data')
        expect(Array.isArray(runners.data)).toBe(true)
        expect(runners.data).toEqual([])
      })

      it('should refresh connected runners using atomWithRefresh', async () => {
        const initialRunners = [
          { id: '1', name: 'Runner 1', email: 'runner1@test.com', userType: 'runner' },
        ]
        const updatedRunners = [
          { id: '1', name: 'Runner 1', email: 'runner1@test.com', userType: 'runner' },
          { id: '2', name: 'Runner 2', email: 'runner2@test.com', userType: 'runner' },
        ]

        mocks.mockApiGet
          .mockResolvedValueOnce({
            data: initialRunners,
          })
          .mockResolvedValueOnce({
            data: updatedRunners,
          })

        // Initial fetch
        const runners1 = await store.get(connectedRunnersAtom)
        expect(runners1.data).toHaveLength(1)

        // Trigger refresh using atomWithRefresh pattern (call setter with no args)
        await store.set(connectedRunnersAtom)

        // Get updated data
        const runners2 = await store.get(connectedRunnersAtom)
        expect(runners2.data).toHaveLength(2)
        expect(mocks.mockApiGet).toHaveBeenCalledTimes(2)
      })
    })

    describe('availableRunnersAtom', () => {
      it('should fetch available runners for coaches', async () => {
        const mockRunners = [
          { id: '3', name: 'Available Runner', email: 'available@test.com', userType: 'runner' },
        ]

        mocks.mockApiGet.mockResolvedValueOnce({
          data: mockRunners,
        })

        const runners = await store.get(availableRunnersAtom)

        expect(Array.isArray(runners)).toBe(true)
        expect(runners).toHaveLength(1)
        expect(runners[0].name).toBe('Available Runner')
        expect(mocks.mockApiGet).toHaveBeenCalledWith(
          '/api/runners/available',
          expect.objectContaining({
            suppressGlobalToast: true,
          })
        )
      })

      it('should handle refresh for available runners', async () => {
        mocks.mockApiGet
          .mockResolvedValueOnce({
            data: [],
          })
          .mockResolvedValueOnce({
            data: [
              { id: '3', name: 'New Runner', email: 'new@test.com', userType: 'runner' },
            ],
          })

        await store.get(availableRunnersAtom)
        // Refresh using atomWithRefresh pattern
        await store.set(availableRunnersAtom)
        const runners = await store.get(availableRunnersAtom)

        expect(runners).toHaveLength(1)
        expect(runners[0].name).toBe('New Runner')
      })
    })

    describe('availableCoachesAtom', () => {
      it('should fetch available coaches for runners', async () => {
        const mockCoaches = [
          { id: '4', name: 'Available Coach', email: 'coach@test.com', userType: 'coach' },
        ]

        mocks.mockApiGet.mockResolvedValueOnce({
          data: mockCoaches,
        })

        const coaches = await store.get(availableCoachesAtom)

        expect(Array.isArray(coaches)).toBe(true)
        expect(coaches).toHaveLength(1)
        expect(coaches[0].name).toBe('Available Coach')
        expect(mocks.mockApiGet).toHaveBeenCalledWith(
          '/api/coaches/available',
          expect.objectContaining({
            suppressGlobalToast: true,
          })
        )
      })

      it('should return empty array on network error', async () => {
        mocks.mockApiGet.mockRejectedValueOnce(new Error('Network error'))

        const coaches = await store.get(availableCoachesAtom)

        expect(Array.isArray(coaches)).toBe(true)
        expect(coaches).toEqual([])
      })
    })
  })

  describe('Training Plans Atoms', () => {
    it('should fetch training plans and return array', async () => {
      const mockPlans = [
        { id: '1', name: '50K Training Plan', archived: false },
        { id: '2', name: '100M Training Plan', archived: false },
      ]

      mocks.mockApiGet.mockResolvedValueOnce({
        data: mockPlans, // Training plans API returns array directly
      })

      const plans = await store.get(refreshableTrainingPlansAtom)

      expect(Array.isArray(plans)).toBe(true)
      expect(plans).toHaveLength(2)
      expect(plans[0].name).toBe('50K Training Plan')
      expect(mocks.mockApiGet).toHaveBeenCalledWith(
        '/api/training-plans',
        expect.objectContaining({
          suppressGlobalToast: true,
        })
      )
    })

    it('should refresh training plans', async () => {
      const initialPlans = [{ id: '1', name: 'Plan 1', archived: false }]
      const updatedPlans = [
        { id: '1', name: 'Plan 1', archived: false },
        { id: '2', name: 'Plan 2', archived: false },
      ]

      mocks.mockApiGet
        .mockResolvedValueOnce({
          data: initialPlans,
        })
        .mockResolvedValueOnce({
          data: updatedPlans,
        })

      await store.get(refreshableTrainingPlansAtom)
      // Refresh using atomWithRefresh pattern
      await store.set(refreshableTrainingPlansAtom)
      const plans = await store.get(refreshableTrainingPlansAtom)

      expect(plans).toHaveLength(2)
    })

    it('should handle API errors gracefully', async () => {
      mocks.mockApiGet.mockRejectedValueOnce(new Error('Unauthorized'))

      const plans = await store.get(refreshableTrainingPlansAtom)

      expect(Array.isArray(plans)).toBe(true)
      expect(plans).toEqual([])
    })

    it('should handle non-array response', async () => {
      mocks.mockApiGet.mockResolvedValueOnce({
        data: null,
      })

      const plans = await store.get(refreshableTrainingPlansAtom)

      expect(Array.isArray(plans)).toBe(true)
      expect(plans).toEqual([])
    })
  })

  describe('Workout Atoms', () => {
    it('should handle static workouts atom', () => {
      // workoutsAtom is a simple atom, not async
      const initialWorkouts = store.get(workoutsAtom)
      expect(Array.isArray(initialWorkouts)).toBe(true)
      expect(initialWorkouts).toEqual([])

      // Set some workouts
      const mockWorkouts = [
        { id: '1', title: 'Easy Run', category: 'easy', completed: false },
        { id: '2', title: 'Long Run', category: 'long_run', completed: false },
      ]
      store.set(workoutsAtom, mockWorkouts)

      const workouts = store.get(workoutsAtom)
      expect(workouts).toHaveLength(2)
      expect(workouts[0].title).toBe('Easy Run')
    })
  })

  describe('Error Handling', () => {
    it('should handle network failures gracefully', async () => {
      mocks.mockApiGet.mockRejectedValueOnce(new Error('Network failure'))

      const runners = await store.get(connectedRunnersAtom)

      expect(runners).toHaveProperty('data')
      expect(Array.isArray(runners.data)).toBe(true)
      expect(runners.data).toEqual([])
    })

    it('should handle API errors', async () => {
      mocks.mockApiGet.mockRejectedValueOnce(new Error('Invalid API response'))

      const plans = await store.get(refreshableTrainingPlansAtom)

      expect(Array.isArray(plans)).toBe(true)
      expect(plans).toEqual([])
    })

    it('should handle timeout errors', async () => {
      mocks.mockApiGet.mockImplementationOnce(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
      )

      const coaches = await store.get(availableCoachesAtom)

      expect(Array.isArray(coaches)).toBe(true)
      expect(coaches).toEqual([])
    })
  })

  describe('Concurrent Fetches', () => {
    it('should handle multiple concurrent atom fetches', async () => {
      mocks.mockApiGet
        .mockResolvedValueOnce({
          data: [{ id: '1', name: 'Runner 1' }],
        })
        .mockResolvedValueOnce({
          data: [{ id: '2', name: 'Coach 1' }],
        })
        .mockResolvedValueOnce({
          data: [{ id: '3', name: 'Plan 1' }],
        })

      const [runners, coaches, plans] = await Promise.all([
        store.get(connectedRunnersAtom),
        store.get(availableCoachesAtom),
        store.get(refreshableTrainingPlansAtom),
      ])

      expect(runners.data).toHaveLength(1)
      expect(coaches).toHaveLength(1)
      expect(plans).toHaveLength(1)
      expect(mocks.mockApiGet).toHaveBeenCalledTimes(3)
    })
  })
})
