/**
 * Relationships Atoms Unit Tests
 *
 * Tests the coach-runner relationship atoms
 */
import { createStore } from 'jotai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  connectCoachFormAtom,
  connectingRunnerIdsAtom,
  inviteRunnerFormAtom,
  relationshipSearchTermAtom,
  relationshipStatusFilterAtom,
  relationshipsAtom,
  relationshipsErrorAtom,
  relationshipsLoadingAtom,
  runnerSearchTermAtom,
  selectedRelationshipAtom,
  selectedRelationshipIdAtom,
} from '@/lib/atoms/relationships'

import {
  createMockRelationship,
  createTestStore,
  getAtomValue,
  setAtomValue,
  setupCommonMocks,
} from './utils/test-helpers'

describe('Relationships Atoms', () => {
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

  describe('Core relationship atoms', () => {
    it('should have empty array as initial value for relationshipsAtom', () => {
      const relationships = getAtomValue(store, relationshipsAtom)
      expect(relationships).toEqual([])
    })

    it('should store relationships', () => {
      const mockRelationships = [
        createMockRelationship({ id: 'r1', status: 'active' }),
        createMockRelationship({ id: 'r2', status: 'pending' }),
      ]

      setAtomValue(store, relationshipsAtom, mockRelationships)

      const relationships = getAtomValue(store, relationshipsAtom)
      expect(relationships).toHaveLength(2)
      expect(relationships[0].status).toBe('active')
      expect(relationships[1].status).toBe('pending')
    })

    it('should track loading state', () => {
      expect(getAtomValue(store, relationshipsLoadingAtom)).toBe(false)

      setAtomValue(store, relationshipsLoadingAtom, true)
      expect(getAtomValue(store, relationshipsLoadingAtom)).toBe(true)
    })

    it('should track error state', () => {
      expect(getAtomValue(store, relationshipsErrorAtom)).toBe(null)

      setAtomValue(store, relationshipsErrorAtom, 'Failed to fetch relationships')
      expect(getAtomValue(store, relationshipsErrorAtom)).toBe('Failed to fetch relationships')
    })
  })

  describe('Selection atoms', () => {
    it('should track selected relationship', () => {
      const relationship = createMockRelationship({ id: 'r1' })

      expect(getAtomValue(store, selectedRelationshipAtom)).toBe(null)

      setAtomValue(store, selectedRelationshipAtom, relationship)
      expect(getAtomValue(store, selectedRelationshipAtom)).toBe(relationship)
    })

    it('should track selected relationship ID', () => {
      expect(getAtomValue(store, selectedRelationshipIdAtom)).toBe(null)

      setAtomValue(store, selectedRelationshipIdAtom, 'r1')
      expect(getAtomValue(store, selectedRelationshipIdAtom)).toBe('r1')
    })
  })

  describe('Filter atoms', () => {
    it('should track status filter', () => {
      expect(getAtomValue(store, relationshipStatusFilterAtom)).toBe('all')

      setAtomValue(store, relationshipStatusFilterAtom, 'active')
      expect(getAtomValue(store, relationshipStatusFilterAtom)).toBe('active')

      setAtomValue(store, relationshipStatusFilterAtom, 'pending')
      expect(getAtomValue(store, relationshipStatusFilterAtom)).toBe('pending')

      setAtomValue(store, relationshipStatusFilterAtom, 'inactive')
      expect(getAtomValue(store, relationshipStatusFilterAtom)).toBe('inactive')
    })

    it('should track search term', () => {
      expect(getAtomValue(store, relationshipSearchTermAtom)).toBe('')

      setAtomValue(store, relationshipSearchTermAtom, 'John Doe')
      expect(getAtomValue(store, relationshipSearchTermAtom)).toBe('John Doe')
    })
  })

  describe('Form atoms', () => {
    describe('inviteRunnerFormAtom', () => {
      it('should have initial empty form values', () => {
        const formData = getAtomValue(store, inviteRunnerFormAtom)
        expect(formData).toEqual({
          email: '',
          name: '',
          message: '',
        })
      })

      it('should update form values', () => {
        const newFormData = {
          email: 'runner@example.com',
          name: 'John Runner',
          message: 'Welcome to my coaching program!',
        }

        setAtomValue(store, inviteRunnerFormAtom, newFormData)
        expect(getAtomValue(store, inviteRunnerFormAtom)).toEqual(newFormData)
      })

      it('should reset form values', () => {
        // Set some data
        setAtomValue(store, inviteRunnerFormAtom, {
          email: 'test@example.com',
          name: 'Test',
          message: 'Test message',
        })

        // Reset to empty
        setAtomValue(store, inviteRunnerFormAtom, {
          email: '',
          name: '',
          message: '',
        })

        expect(getAtomValue(store, inviteRunnerFormAtom)).toEqual({
          email: '',
          name: '',
          message: '',
        })
      })
    })

    describe('connectCoachFormAtom', () => {
      it('should have initial empty form values', () => {
        const formData = getAtomValue(store, connectCoachFormAtom)
        expect(formData).toEqual({
          coachId: '',
          message: '',
        })
      })

      it('should update form values', () => {
        const newFormData = {
          coachId: 'coach-123',
          message: 'I would like to join your training program',
        }

        setAtomValue(store, connectCoachFormAtom, newFormData)
        expect(getAtomValue(store, connectCoachFormAtom)).toEqual(newFormData)
      })
    })
  })

  describe('Search and connection atoms', () => {
    it('should track runner search term', () => {
      expect(getAtomValue(store, runnerSearchTermAtom)).toBe('')

      setAtomValue(store, runnerSearchTermAtom, 'marathon runner')
      expect(getAtomValue(store, runnerSearchTermAtom)).toBe('marathon runner')
    })

    it('should track connecting runner IDs', () => {
      const ids = getAtomValue(store, connectingRunnerIdsAtom)
      expect(ids).toBeInstanceOf(Set)
      expect(ids.size).toBe(0)

      const newIds = new Set(['runner-1', 'runner-2'])
      setAtomValue(store, connectingRunnerIdsAtom, newIds)

      const updatedIds = getAtomValue(store, connectingRunnerIdsAtom)
      expect(updatedIds.size).toBe(2)
      expect(updatedIds.has('runner-1')).toBe(true)
      expect(updatedIds.has('runner-2')).toBe(true)
    })

    it('should add and remove connecting runner IDs', () => {
      // Start with empty set
      let ids = new Set<string>()
      setAtomValue(store, connectingRunnerIdsAtom, ids)

      // Add a runner ID
      ids = new Set(getAtomValue(store, connectingRunnerIdsAtom))
      ids.add('runner-1')
      setAtomValue(store, connectingRunnerIdsAtom, ids)
      expect(getAtomValue(store, connectingRunnerIdsAtom).has('runner-1')).toBe(true)

      // Add another runner ID
      ids = new Set(getAtomValue(store, connectingRunnerIdsAtom))
      ids.add('runner-2')
      setAtomValue(store, connectingRunnerIdsAtom, ids)
      expect(getAtomValue(store, connectingRunnerIdsAtom).size).toBe(2)

      // Remove a runner ID
      ids = new Set(getAtomValue(store, connectingRunnerIdsAtom))
      ids.delete('runner-1')
      setAtomValue(store, connectingRunnerIdsAtom, ids)
      expect(getAtomValue(store, connectingRunnerIdsAtom).has('runner-1')).toBe(false)
      expect(getAtomValue(store, connectingRunnerIdsAtom).size).toBe(1)
    })
  })

  describe('Relationship management', () => {
    it('should filter relationships by status', () => {
      const relationships = [
        createMockRelationship({ id: 'r1', status: 'active' }),
        createMockRelationship({ id: 'r2', status: 'pending' }),
        createMockRelationship({ id: 'r3', status: 'active' }),
        createMockRelationship({ id: 'r4', status: 'inactive' }),
      ]
      setAtomValue(store, relationshipsAtom, relationships)

      // Simulate filtering logic (this would be in a derived atom)
      const filter = 'active'
      const filtered = relationships.filter(r => r.status === filter)

      expect(filtered).toHaveLength(2)
      expect(filtered.every(r => r.status === 'active')).toBe(true)
    })

    it('should update relationship status', () => {
      const relationships = [
        createMockRelationship({ id: 'r1', status: 'pending' }),
        createMockRelationship({ id: 'r2', status: 'active' }),
      ]
      setAtomValue(store, relationshipsAtom, relationships)

      // Update relationship status
      const updated = getAtomValue(store, relationshipsAtom).map(r =>
        r.id === 'r1' ? { ...r, status: 'active' as const } : r
      )
      setAtomValue(store, relationshipsAtom, updated)

      const result = getAtomValue(store, relationshipsAtom)
      expect(result[0].status).toBe('active')
    })

    it('should remove a relationship', () => {
      const relationships = [
        createMockRelationship({ id: 'r1' }),
        createMockRelationship({ id: 'r2' }),
        createMockRelationship({ id: 'r3' }),
      ]
      setAtomValue(store, relationshipsAtom, relationships)

      const filtered = getAtomValue(store, relationshipsAtom).filter(r => r.id !== 'r2')
      setAtomValue(store, relationshipsAtom, filtered)

      const result = getAtomValue(store, relationshipsAtom)
      expect(result).toHaveLength(2)
      expect(result.find(r => r.id === 'r2')).toBeUndefined()
    })
  })

  describe('Complex scenarios', () => {
    it('should handle invitation workflow', () => {
      // Set up invitation form
      setAtomValue(store, inviteRunnerFormAtom, {
        email: 'newrunner@example.com',
        name: 'New Runner',
        message: 'Join my training program!',
      })

      // Simulate invitation sent
      const newRelationship = createMockRelationship({
        id: 'r-new',
        status: 'pending',
        runner_id: 'temp-runner-id',
      })

      const relationships = getAtomValue(store, relationshipsAtom)
      setAtomValue(store, relationshipsAtom, [...relationships, newRelationship])

      // Reset form after invitation
      setAtomValue(store, inviteRunnerFormAtom, {
        email: '',
        name: '',
        message: '',
      })

      // Verify state
      expect(getAtomValue(store, relationshipsAtom)).toHaveLength(1)
      expect(getAtomValue(store, relationshipsAtom)[0].status).toBe('pending')
      expect(getAtomValue(store, inviteRunnerFormAtom).email).toBe('')
    })

    it('should handle multiple pending connections', () => {
      // Set up connecting runner IDs
      const connectingIds = new Set(['runner-1', 'runner-2', 'runner-3'])
      setAtomValue(store, connectingRunnerIdsAtom, connectingIds)

      // Simulate successful connection for runner-1
      const ids = new Set(getAtomValue(store, connectingRunnerIdsAtom))
      ids.delete('runner-1')
      setAtomValue(store, connectingRunnerIdsAtom, ids)

      // Add relationship for connected runner
      const newRelationship = createMockRelationship({
        id: 'r1',
        runner_id: 'runner-1',
        status: 'active',
      })
      setAtomValue(store, relationshipsAtom, [newRelationship])

      // Verify state
      expect(getAtomValue(store, connectingRunnerIdsAtom).size).toBe(2)
      expect(getAtomValue(store, connectingRunnerIdsAtom).has('runner-1')).toBe(false)
      expect(getAtomValue(store, relationshipsAtom)[0].runner_id).toBe('runner-1')
    })
  })
})
