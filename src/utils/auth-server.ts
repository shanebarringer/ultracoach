/**
 * Server-side authentication utilities for Next.js 15 App Router
 *
 * This module provides server-side session management utilities that force
 * dynamic rendering and integrate with Better Auth for secure authentication.
 */
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/better-auth'
import { createLogger } from '@/lib/logger'

const logger = createLogger('AuthServer')

// Type definitions for Better Auth session data
interface BetterAuthUser {
  id: string
  email: string
  name: string | null
  role?: 'coach' | 'runner'
  userType?: string
  fullName?: string | null
}

interface BetterAuthSession {
  user: BetterAuthUser
  session: {
    id: string
    token: string
    expiresAt: string
    createdAt: string
    updatedAt: string
  }
}

export interface ServerSession {
  user: {
    id: string
    email: string
    name: string | null
    role: 'coach' | 'runner'
    userType: 'coach' | 'runner'
  }
}

// Type guard to ensure user has proper role
function isValidUserRole(role: unknown): role is 'coach' | 'runner' {
  return typeof role === 'string' && (role === 'coach' || role === 'runner')
}

// Type guard for Better Auth session
function isBetterAuthSession(session: unknown): session is BetterAuthSession {
  if (typeof session !== 'object' || session === null) {
    return false
  }

  const sessionObj = session as Record<string, unknown>

  return 'user' in sessionObj && typeof sessionObj.user === 'object' && sessionObj.user !== null
}

/**
 * Get the current session server-side, forcing dynamic rendering
 *
 * This function MUST be called from Server Components only.
 * It forces dynamic rendering by accessing headers.
 */
export async function getServerSession(): Promise<ServerSession | null> {
  try {
    // Check if we're in build-time static generation
    if (
      process.env.NODE_ENV === 'production' &&
      !process.env.VERCEL_URL &&
      !process.env.NEXT_RUNTIME
    ) {
      logger.info('Skipping session check during build-time static generation')
      return null
    }

    // Force dynamic rendering by accessing headers
    const headersList = await headers()

    logger.info('Getting server session', {
      userAgent: headersList.get('user-agent')?.substring(0, 50),
    })

    // Better Auth server-side session retrieval
    const rawSession = await auth.api.getSession({
      headers: headersList,
    })

    if (!rawSession?.user) {
      logger.info('No active session found')
      return null
    }

    // Type-safe session handling with proper validation
    if (!isBetterAuthSession(rawSession)) {
      logger.error('Invalid session structure returned from Better Auth')
      return null
    }

    const { user } = rawSession

    // Extract role using type-safe approach
    // Priority 1: Use 'userType' field as source of truth (per CLAUDE.md documentation)
    // Priority 2: Fall back to 'role' field for backward compatibility
    const roleCandidate = user.userType || user.role
    const userRole = isValidUserRole(roleCandidate) ? roleCandidate : 'runner'

    // ENHANCED DEBUG: Track role detection with type safety
    logger.debug('🔍 AUTH DEBUG - Type-Safe Session Data:', {
      userId: user.id,
      email: user.email?.replace(/(^..).+(@.*$)/, '$1***$2'),
      rawRole: user.role,
      rawUserType: user.userType,
      resolvedRole: userRole,
      roleType: typeof userRole,
      isValidRole: isValidUserRole(roleCandidate),
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      deployment: process.env.VERCEL_URL ? 'vercel' : 'local',
    })

    if (roleCandidate && !isValidUserRole(roleCandidate)) {
      logger.warn('Invalid role detected, defaulting to runner', {
        invalidRole: roleCandidate,
        resolvedRole: userRole,
      })
    }

    const serverSession: ServerSession = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name || null,
        role: userRole,
        userType: userRole,
      },
    }

    logger.info('Server session retrieved successfully', {
      userId: serverSession.user.id,
      role: serverSession.user.role,
      email: serverSession.user.email,
    })

    return serverSession
  } catch (error) {
    // Handle build-time errors gracefully
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage?.includes('headers') || errorMessage?.includes('Dynamic server usage')) {
      logger.info('Build-time context detected, skipping session check')
      return null
    }

    logger.error('Failed to get server session:', error)
    return null
  }
}

/**
 * Require authentication on a server component
 * Redirects to signin if no session exists
 */
export async function requireAuth(): Promise<ServerSession> {
  const session = await getServerSession()

  if (!session) {
    logger.info('Authentication required, redirecting to signin')
    redirect('/auth/signin')
  }

  return session
}

/**
 * Require a specific role, redirecting if user doesn't have it
 */
export async function requireRole(role: 'coach' | 'runner'): Promise<ServerSession> {
  const session = await requireAuth()

  if (session.user.role !== role) {
    logger.warn('Role mismatch, redirecting to dashboard', {
      required: role,
      actual: session.user.role,
      userId: session.user.id,
    })
    redirect('/dashboard')
  }

  return session
}

/**
 * Require coach role
 */
export async function requireCoach(): Promise<ServerSession> {
  return requireRole('coach')
}

/**
 * Require runner role
 */
export async function requireRunner(): Promise<ServerSession> {
  return requireRole('runner')
}

/**
 * Get user data by ID server-side
 */
export async function getUserById(userId: string) {
  try {
    // Force dynamic rendering and get incoming request headers
    const headersList = await headers()
    const cookie = headersList.get('cookie') ?? ''
    const authorization = headersList.get('authorization') ?? ''

    logger.info('Fetching user by ID', { userId })

    // Build absolute URL from incoming request to satisfy Node fetch URL parsing in all contexts
    const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
    const proto =
      headersList.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
    const base = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_APP_URL || ''

    // Call internal API with forwarded auth context; use no-store to avoid caching
    const response = await fetch(`${base}/api/users/${userId}`, {
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(authorization ? { authorization } : {}),
        accept: 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      logger.error('Failed to fetch user:', {
        userId,
        status: response.status,
        statusText: response.statusText,
      })
      return null
    }

    const data = await response.json()

    if (!data.user) {
      logger.warn('User not found:', { userId })
      return null
    }

    logger.info('User fetched successfully', {
      userId,
      userName: data.user.name || data.user.email,
    })

    return data.user
  } catch (error) {
    logger.error('Error fetching user by ID:', error)
    return null
  }
}

/**
 * Verify conversation permission between current user and recipient
 * Uses direct database query to check coach_runners table for active relationships
 */
export async function verifyConversationPermission(recipientId: string): Promise<boolean> {
  try {
    const session = await getServerSession()

    if (!session) {
      logger.warn('No session found for conversation permission check')
      return false
    }

    // Users can always message themselves (for testing)
    if (session.user.id === recipientId) {
      logger.info('Conversation permission granted - messaging self', {
        userId: session.user.id,
      })
      return true
    }

    // Direct database query to check for active coach-runner relationship
    // This eliminates cookie forwarding issues that occur with server-side fetch
    const { db } = await import('@/lib/db')
    const { coach_runners } = await import('@/lib/schema')
    const { and, or, eq } = await import('drizzle-orm')

    const relationships = await db
      .select({
        id: coach_runners.id,
        status: coach_runners.status,
        coach_id: coach_runners.coach_id,
        runner_id: coach_runners.runner_id,
      })
      .from(coach_runners)
      .where(
        and(
          // Check for bidirectional relationship
          or(
            and(
              eq(coach_runners.coach_id, session.user.id),
              eq(coach_runners.runner_id, recipientId)
            ),
            and(
              eq(coach_runners.runner_id, session.user.id),
              eq(coach_runners.coach_id, recipientId)
            )
          ),
          // Only active relationships
          eq(coach_runners.status, 'active')
        )
      )
      .limit(1)

    const hasActiveRelationship = relationships.length > 0

    if (hasActiveRelationship) {
      logger.info('Conversation permission granted via active relationship', {
        currentUser: session.user.id,
        recipient: recipientId,
        relationshipId: relationships[0].id,
      })
      return true
    } else {
      logger.warn('Conversation permission denied - no active relationship found', {
        currentUser: session.user.id,
        recipient: recipientId,
      })
      return false
    }
  } catch (error) {
    logger.error('Error verifying conversation permission:', error)
    // Fail closed - deny permission if we can't verify relationship
    return false
  }
}

/**
 * Check if user has access to a specific resource
 * This is a placeholder for more complex authorization logic
 */
export async function checkResourceAccess(resourceId: string, action: string): Promise<boolean> {
  const session = await getServerSession()

  if (!session) {
    return false
  }

  // TODO: Implement resource-specific authorization logic
  // For now, authenticated users have access to their own resources
  logger.info('Checking resource access', {
    userId: session.user.id,
    resourceId,
    action,
  })

  return true
}
