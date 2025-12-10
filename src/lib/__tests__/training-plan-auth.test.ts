/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { checkTrainingPlanAccess } from '../training-plan-auth'
import type { AuthPlanInfo, AuthUserInfo } from '../training-plan-auth'

// Mock the logger module
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('checkTrainingPlanAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Coach authorization', () => {
    it('should grant access when coach_id matches user id', () => {
      const user: AuthUserInfo = { id: 'coach-123', userType: 'coach' }
      const plan: AuthPlanInfo = { coach_id: 'coach-123', runner_id: 'runner-456' }

      const result = checkTrainingPlanAccess(user, plan)

      expect(result.hasAccess).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should deny access when coach_id does not match user id', () => {
      const user: AuthUserInfo = { id: 'coach-123', userType: 'coach' }
      const plan: AuthPlanInfo = { coach_id: 'different-coach', runner_id: 'runner-456' }

      const result = checkTrainingPlanAccess(user, plan)

      expect(result.hasAccess).toBe(false)
      expect(result.reason).toBe('Coach does not own this plan')
    })

    it('should deny access when coach_id is null', () => {
      const user: AuthUserInfo = { id: 'coach-123', userType: 'coach' }
      const plan: AuthPlanInfo = { coach_id: null, runner_id: 'runner-456' }

      const result = checkTrainingPlanAccess(user, plan)

      expect(result.hasAccess).toBe(false)
      expect(result.reason).toBe('Coach does not own this plan')
    })
  })

  describe('Runner authorization', () => {
    it('should grant access when runner_id matches user id', () => {
      const user: AuthUserInfo = { id: 'runner-456', userType: 'runner' }
      const plan: AuthPlanInfo = { coach_id: 'coach-123', runner_id: 'runner-456' }

      const result = checkTrainingPlanAccess(user, plan)

      expect(result.hasAccess).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should deny access when runner_id does not match user id', () => {
      const user: AuthUserInfo = { id: 'runner-456', userType: 'runner' }
      const plan: AuthPlanInfo = { coach_id: 'coach-123', runner_id: 'different-runner' }

      const result = checkTrainingPlanAccess(user, plan)

      expect(result.hasAccess).toBe(false)
      expect(result.reason).toBe('Runner not assigned to this plan')
    })

    it('should deny access when runner_id is null', () => {
      const user: AuthUserInfo = { id: 'runner-456', userType: 'runner' }
      const plan: AuthPlanInfo = { coach_id: 'coach-123', runner_id: null }

      const result = checkTrainingPlanAccess(user, plan)

      expect(result.hasAccess).toBe(false)
      expect(result.reason).toBe('Runner not assigned to this plan')
    })
  })

  describe('Unknown userType handling', () => {
    it('should deny access for unknown userType', () => {
      const user: AuthUserInfo = { id: 'user-789', userType: 'admin' }
      const plan: AuthPlanInfo = { coach_id: 'coach-123', runner_id: 'runner-456' }

      const result = checkTrainingPlanAccess(user, plan)

      expect(result.hasAccess).toBe(false)
      expect(result.reason).toBe('Unknown userType: admin')
    })

    it('should deny access for empty userType', () => {
      const user: AuthUserInfo = { id: 'user-789', userType: '' }
      const plan: AuthPlanInfo = { coach_id: 'coach-123', runner_id: 'runner-456' }

      const result = checkTrainingPlanAccess(user, plan)

      expect(result.hasAccess).toBe(false)
      expect(result.reason).toBe('Unknown userType: ')
    })
  })

  describe('Edge cases', () => {
    it('should handle both coach and runner IDs being null', () => {
      const user: AuthUserInfo = { id: 'coach-123', userType: 'coach' }
      const plan: AuthPlanInfo = { coach_id: null, runner_id: null }

      const result = checkTrainingPlanAccess(user, plan)

      expect(result.hasAccess).toBe(false)
      expect(result.reason).toBe('Coach does not own this plan')
    })

    it('should handle same user being both coach and runner (unusual but valid)', () => {
      const userId = 'dual-role-user'
      const plan: AuthPlanInfo = { coach_id: userId, runner_id: userId }

      // As coach
      const coachResult = checkTrainingPlanAccess({ id: userId, userType: 'coach' }, plan)
      expect(coachResult.hasAccess).toBe(true)

      // As runner
      const runnerResult = checkTrainingPlanAccess({ id: userId, userType: 'runner' }, plan)
      expect(runnerResult.hasAccess).toBe(true)
    })
  })
})
