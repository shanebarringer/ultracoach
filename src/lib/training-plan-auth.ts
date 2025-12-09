import { createLogger } from '@/lib/logger'

const logger = createLogger('TrainingPlanAuth')

/**
 * Minimal user info required for training plan authorization.
 */
export type AuthUserInfo = {
  id: string
  userType: string
}

/**
 * Minimal plan info required for training plan authorization.
 */
export type AuthPlanInfo = {
  coach_id: string | null
  runner_id: string | null
}

/**
 * Result of a training plan access check.
 */
export type AuthResult = {
  hasAccess: boolean
  reason?: string
}

/**
 * Check if a user has access to a training plan.
 *
 * Implements explicit authorization for coach/runner with default-deny for unknown types.
 * This is the canonical implementation - all API routes should use this helper.
 *
 * @param user - User info with id and userType
 * @param plan - Plan info with coach_id and runner_id
 * @returns AuthResult indicating access status and optional reason for denial
 *
 * @example
 * ```ts
 * const { hasAccess, reason } = checkTrainingPlanAccess(
 *   { id: session.user.id, userType: session.user.userType },
 *   { coach_id: plan.coach_id, runner_id: plan.runner_id }
 * )
 * if (!hasAccess) {
 *   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
 * }
 * ```
 */
export function checkTrainingPlanAccess(user: AuthUserInfo, plan: AuthPlanInfo): AuthResult {
  if (user.userType === 'coach') {
    const hasAccess = plan.coach_id === user.id
    return {
      hasAccess,
      reason: hasAccess ? undefined : 'Coach does not own this plan',
    }
  }

  if (user.userType === 'runner') {
    const hasAccess = plan.runner_id === user.id
    return {
      hasAccess,
      reason: hasAccess ? undefined : 'Runner not assigned to this plan',
    }
  }

  // Default deny for unknown user types - log warning for observability
  logger.warn('Unknown userType attempted training plan access', {
    userId: user.id,
    userType: user.userType,
  })

  return {
    hasAccess: false,
    reason: `Unknown userType: ${user.userType}`,
  }
}
