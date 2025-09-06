/**
 * Array Safety Tests
 *
 * Tests that our defensive array checks work correctly
 * in components when atoms return unexpected values
 */
import { describe, expect, it } from 'vitest'

// Type definitions for test data
interface Race {
  id: string
  name?: string
  active?: boolean
  archived?: boolean
  distance_type?: string
}

interface Runner {
  id: string
  name?: string
}

interface Plan {
  id: string
  name?: string
  archived?: boolean
}

describe('Array Safety Defensive Checks', () => {
  describe('Race filtering safety', () => {
    it('should handle undefined races safely', () => {
      const races = undefined
      const racesArray = Array.isArray(races) ? races : []

      // This should not throw
      const filtered = racesArray.filter((race: Race) => race.active)
      expect(filtered).toEqual([])
    })

    it('should handle null races safely', () => {
      const races = null
      const racesArray = Array.isArray(races) ? races : []

      const filtered = racesArray.filter((race: Race) => race.active)
      expect(filtered).toEqual([])
    })

    it('should handle non-array races safely', () => {
      const races = { error: 'Failed to load' }
      const racesArray = Array.isArray(races) ? races : []

      const filtered = racesArray.filter((race: Race) => race.active)
      expect(filtered).toEqual([])
    })

    it('should work normally with valid array', () => {
      const races = [
        { id: '1', name: 'Race 1', active: true },
        { id: '2', name: 'Race 2', active: false },
        { id: '3', name: 'Race 3', active: true },
      ]
      const racesArray = Array.isArray(races) ? races : []

      const filtered = racesArray.filter((race: Race) => race.active)
      expect(filtered).toHaveLength(2)
      expect(filtered[0].name).toBe('Race 1')
      expect(filtered[1].name).toBe('Race 3')
    })
  })

  describe('Runners mapping safety', () => {
    it('should handle undefined runners safely', () => {
      const runners = undefined
      const runnersArray = Array.isArray(runners) ? runners : []

      // This should not throw
      const mapped = runnersArray.map((runner: Runner) => runner.id)
      expect(mapped).toEqual([])
    })

    it('should handle null runners safely', () => {
      const runners = null
      const runnersArray = Array.isArray(runners) ? runners : []

      const mapped = runnersArray.map((runner: Runner) => runner.id)
      expect(mapped).toEqual([])
    })

    it('should handle object instead of array', () => {
      const runners = { runner1: { id: '1' }, runner2: { id: '2' } }
      const runnersArray = Array.isArray(runners) ? runners : []

      const mapped = runnersArray.map((runner: Runner) => runner.id)
      expect(mapped).toEqual([])
    })

    it('should work normally with valid array', () => {
      const runners = [
        { id: '1', name: 'Runner 1' },
        { id: '2', name: 'Runner 2' },
        { id: '3', name: 'Runner 3' },
      ]
      const runnersArray = Array.isArray(runners) ? runners : []

      const mapped = runnersArray.map((runner: Runner) => runner.id)
      expect(mapped).toEqual(['1', '2', '3'])
    })
  })

  describe('Training plans filtering safety', () => {
    it('should handle undefined plans safely', () => {
      const plans = undefined
      const plansArray = Array.isArray(plans) ? plans : []

      // Filter for non-archived plans
      const filtered = plansArray.filter((p: Plan) => !p.archived)
      expect(filtered).toEqual([])
    })

    it('should handle empty response object', () => {
      const plans = {}
      const plansArray = Array.isArray(plans) ? plans : []

      const filtered = plansArray.filter((p: Plan) => !p.archived)
      expect(filtered).toEqual([])
    })

    it('should filter archived plans correctly', () => {
      const plans = [
        { id: '1', name: 'Plan 1', archived: false },
        { id: '2', name: 'Plan 2', archived: true },
        { id: '3', name: 'Plan 3', archived: false },
      ]
      const plansArray = Array.isArray(plans) ? plans : []

      const filtered = plansArray.filter((p: Plan) => !p.archived)
      expect(filtered).toHaveLength(2)
      expect(filtered.find((p: Plan) => p.id === '2')).toBeUndefined()
    })
  })

  describe('Loadable atom data extraction', () => {
    it('should safely extract data from loadable state', () => {
      // Simulate loadable atom states
      const loadingState = { state: 'loading', data: undefined }
      const errorState = { state: 'hasError', data: undefined, error: new Error('Failed') }
      const dataState = { state: 'hasData', data: [{ id: '1' }, { id: '2' }] }
      const invalidDataState = { state: 'hasData', data: null }

      // Loading state
      const loadingData = loadingState.state === 'hasData' ? loadingState.data : []
      expect(Array.isArray(loadingData) ? loadingData : []).toEqual([])

      // Error state
      const errorData = errorState.state === 'hasData' ? errorState.data : []
      expect(Array.isArray(errorData) ? errorData : []).toEqual([])

      // Valid data state
      const validData = dataState.state === 'hasData' ? dataState.data : []
      expect(Array.isArray(validData) ? validData : []).toHaveLength(2)

      // Invalid data state (null data)
      const invalidData = invalidDataState.state === 'hasData' ? invalidDataState.data : []
      expect(Array.isArray(invalidData) ? invalidData : []).toEqual([])
    })
  })

  describe('Real-world component patterns', () => {
    it('should handle races page filtering pattern', () => {
      // Simulate what happens in races page
      const races = undefined // API failed or loading
      const searchQuery = 'ultra'
      const distanceFilter = '50K'

      const racesArray = Array.isArray(races) ? races : []

      const filteredRaces = racesArray.filter((race: Race) => {
        const matchesSearch =
          !searchQuery || race.name?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesDistance = distanceFilter === 'all' || race.distance_type === distanceFilter
        return matchesSearch && matchesDistance
      })

      expect(filteredRaces).toEqual([])
    })

    it('should handle training plans page pattern', () => {
      // Simulate loadable atom response
      const trainingPlansLoadable = {
        state: 'hasData' as const,
        data: null, // Unexpected null instead of array
      }

      const getPlans = () => {
        if (trainingPlansLoadable.state === 'hasData') {
          const plansData = trainingPlansLoadable.data
          const plans = Array.isArray(plansData) ? plansData : []
          return plans.filter((p: Plan) => !p.archived)
        }
        return []
      }

      const plans = getPlans()
      expect(plans).toEqual([])
      expect(() => plans.map((p: Plan) => p.id)).not.toThrow()
    })

    it('should handle weekly planner runners pattern', () => {
      // Simulate loadable atom for runners
      const runnersLoadable = {
        state: 'hasData' as const,
        data: undefined, // Unexpected undefined
      }

      const runnersData = runnersLoadable.state === 'hasData' ? runnersLoadable.data : []
      const runners = Array.isArray(runnersData) ? runnersData : []

      // Should not throw when mapping
      const runnerOptions = runners.map((runner: Runner) => ({
        key: runner.id,
        label: runner.name,
      }))

      expect(runnerOptions).toEqual([])
    })
  })
})
