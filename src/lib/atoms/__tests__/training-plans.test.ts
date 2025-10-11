/**
 * Training Plans Atoms Unit Tests
 *
 * Tests the training plan-related atoms
 */
import { createStore } from 'jotai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  editingTrainingPlanIdAtom,
  isEditingTrainingPlanAtom,
  selectedTrainingPlanAtom,
  selectedTrainingPlanIdAtom,
  trainingPlanFormDataAtom,
  trainingPlanSearchTermAtom,
  trainingPlanSortByAtom,
  trainingPlanStatusFilterAtom,
  trainingPlansAtom,
} from '@/lib/atoms/training-plans'

import {
  createMockTrainingPlan,
  createTestStore,
  getAtomValue,
  setAtomValue,
  setupCommonMocks,
} from './utils/test-helpers'

describe('Training Plans Atoms', () => {
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

  describe('Core training plan atoms', () => {
    it('should have empty array as initial value for trainingPlansAtom', () => {
      const plans = getAtomValue(store, trainingPlansAtom)
      expect(plans).toEqual([])
    })

    it('should store training plans', () => {
      const mockPlans = [
        createMockTrainingPlan({ id: 'p1', name: '50K Training Plan' }),
        createMockTrainingPlan({ id: 'p2', name: '100M Training Plan' }),
      ]

      setAtomValue(store, trainingPlansAtom, mockPlans)

      const plans = getAtomValue(store, trainingPlansAtom)
      expect(plans).toHaveLength(2)
      expect(plans[0].name).toBe('50K Training Plan')
      expect(plans[1].name).toBe('100M Training Plan')
    })
  })

  describe('Selection atoms', () => {
    it('should track selected training plan', () => {
      const plan = createMockTrainingPlan({ id: 'p1' })

      expect(getAtomValue(store, selectedTrainingPlanAtom)).toBe(null)

      setAtomValue(store, selectedTrainingPlanAtom, plan)
      expect(getAtomValue(store, selectedTrainingPlanAtom)).toBe(plan)
    })

    it('should track selected training plan ID', () => {
      expect(getAtomValue(store, selectedTrainingPlanIdAtom)).toBe(null)

      setAtomValue(store, selectedTrainingPlanIdAtom, 'p1')
      expect(getAtomValue(store, selectedTrainingPlanIdAtom)).toBe('p1')
    })
  })

  describe('Filter atoms', () => {
    it('should track search term', () => {
      expect(getAtomValue(store, trainingPlanSearchTermAtom)).toBe('')

      setAtomValue(store, trainingPlanSearchTermAtom, '100M')
      expect(getAtomValue(store, trainingPlanSearchTermAtom)).toBe('100M')
    })

    it('should track status filter', () => {
      expect(getAtomValue(store, trainingPlanStatusFilterAtom)).toBe('all')

      setAtomValue(store, trainingPlanStatusFilterAtom, 'active')
      expect(getAtomValue(store, trainingPlanStatusFilterAtom)).toBe('active')
    })

    it('should track sort order', () => {
      expect(getAtomValue(store, trainingPlanSortByAtom)).toBe('created_at')

      setAtomValue(store, trainingPlanSortByAtom, 'name')
      expect(getAtomValue(store, trainingPlanSortByAtom)).toBe('name')
    })
  })

  describe('Form atoms', () => {
    it('should track form data', () => {
      const formData = {
        name: 'New Training Plan',
        description: 'A comprehensive training plan',
        start_date: '2024-01-01',
        end_date: '2024-06-01',
      }

      expect(getAtomValue(store, trainingPlanFormDataAtom)).toEqual({})

      setAtomValue(store, trainingPlanFormDataAtom, formData)
      expect(getAtomValue(store, trainingPlanFormDataAtom)).toEqual(formData)
    })

    it('should track editing state', () => {
      expect(getAtomValue(store, isEditingTrainingPlanAtom)).toBe(false)

      setAtomValue(store, isEditingTrainingPlanAtom, true)
      expect(getAtomValue(store, isEditingTrainingPlanAtom)).toBe(true)
    })

    it('should track editing plan ID', () => {
      expect(getAtomValue(store, editingTrainingPlanIdAtom)).toBe(null)

      setAtomValue(store, editingTrainingPlanIdAtom, 'p1')
      expect(getAtomValue(store, editingTrainingPlanIdAtom)).toBe('p1')
    })
  })

  describe('Training plan management', () => {
    it('should update a training plan in the list', () => {
      const plans = [
        createMockTrainingPlan({ id: 'p1', name: 'Original Plan' }),
        createMockTrainingPlan({ id: 'p2', name: 'Another Plan' }),
      ]
      setAtomValue(store, trainingPlansAtom, plans)

      const updatedPlans = getAtomValue(store, trainingPlansAtom).map(p =>
        p.id === 'p1' ? { ...p, name: 'Updated Plan' } : p
      )
      setAtomValue(store, trainingPlansAtom, updatedPlans)

      const result = getAtomValue(store, trainingPlansAtom)
      expect(result[0].name).toBe('Updated Plan')
      expect(result[1].name).toBe('Another Plan')
    })

    it('should remove a training plan from the list', () => {
      const plans = [
        createMockTrainingPlan({ id: 'p1', name: 'Plan 1' }),
        createMockTrainingPlan({ id: 'p2', name: 'Plan 2' }),
        createMockTrainingPlan({ id: 'p3', name: 'Plan 3' }),
      ]
      setAtomValue(store, trainingPlansAtom, plans)

      const filteredPlans = getAtomValue(store, trainingPlansAtom).filter(p => p.id !== 'p2')
      setAtomValue(store, trainingPlansAtom, filteredPlans)

      const result = getAtomValue(store, trainingPlansAtom)
      expect(result).toHaveLength(2)
      expect(result.find(p => p.id === 'p2')).toBeUndefined()
    })

    it('should add a new training plan to the list', () => {
      const initialPlans = [createMockTrainingPlan({ id: 'p1', name: 'Existing Plan' })]
      setAtomValue(store, trainingPlansAtom, initialPlans)

      const newPlan = createMockTrainingPlan({ id: 'p2', name: 'New Plan' })
      const updatedPlans = [...getAtomValue(store, trainingPlansAtom), newPlan]
      setAtomValue(store, trainingPlansAtom, updatedPlans)

      const result = getAtomValue(store, trainingPlansAtom)
      expect(result).toHaveLength(2)
      expect(result[1].name).toBe('New Plan')
    })
  })

  describe('Complex scenarios', () => {
    it('should handle multiple state updates correctly', () => {
      // Set some training plans
      const plans = [
        createMockTrainingPlan({ id: 'p1', status: 'active' }),
        createMockTrainingPlan({ id: 'p2', status: 'completed' }),
        createMockTrainingPlan({ id: 'p3', status: 'active' }),
      ]
      setAtomValue(store, trainingPlansAtom, plans)

      // Set filters
      setAtomValue(store, trainingPlanStatusFilterAtom, 'active')
      setAtomValue(store, trainingPlanSearchTermAtom, 'marathon')

      // Select a plan
      setAtomValue(store, selectedTrainingPlanAtom, plans[0])
      setAtomValue(store, selectedTrainingPlanIdAtom, 'p1')

      // Verify state
      expect(getAtomValue(store, trainingPlansAtom)).toHaveLength(3)
      expect(getAtomValue(store, trainingPlanStatusFilterAtom)).toBe('active')
      expect(getAtomValue(store, trainingPlanSearchTermAtom)).toBe('marathon')
      expect(getAtomValue(store, selectedTrainingPlanIdAtom)).toBe('p1')
    })

    it('should handle form data lifecycle', () => {
      // Start editing
      setAtomValue(store, isEditingTrainingPlanAtom, true)
      setAtomValue(store, editingTrainingPlanIdAtom, 'p1')

      // Set form data
      const formData = {
        name: 'Ultra Marathon Training',
        description: '20-week plan for 100K race',
        start_date: '2024-03-01',
        end_date: '2024-07-15',
        status: 'draft' as const,
      }
      setAtomValue(store, trainingPlanFormDataAtom, formData)

      // Simulate form submission
      setAtomValue(store, isEditingTrainingPlanAtom, false)
      setAtomValue(store, editingTrainingPlanIdAtom, null)
      setAtomValue(store, trainingPlanFormDataAtom, {})

      // Verify reset state
      expect(getAtomValue(store, isEditingTrainingPlanAtom)).toBe(false)
      expect(getAtomValue(store, editingTrainingPlanIdAtom)).toBe(null)
      expect(getAtomValue(store, trainingPlanFormDataAtom)).toEqual({})
    })
  })
})
