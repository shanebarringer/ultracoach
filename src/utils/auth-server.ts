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

export interface ServerSession {
  user: {
    id: string
    email: string
    name: string | null
    role: 'coach' | 'runner'
  }
}

/**
 * Get the current session server-side, forcing dynamic rendering
 * 
 * This function MUST be called from Server Components only.
 * It forces dynamic rendering by accessing headers.
 */
export async function getServerSession(): Promise<ServerSession | null> {
  try {
    // Force dynamic rendering by accessing headers
    const headersList = await headers()
    
    logger.info('Getting server session', {
      userAgent: headersList.get('user-agent')?.substring(0, 50)
    })

    // Better Auth server-side session retrieval
    const session = await auth.api.getSession({
      headers: headersList
    })

    if (!session?.user) {
      logger.info('No active session found')
      return null
    }

    const serverSession: ServerSession = {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || null,
        role: ((session.user as { role?: string }).role as 'coach' | 'runner') || 'runner'
      }
    }

    logger.info('Server session retrieved successfully', {
      userId: serverSession.user.id,
      role: serverSession.user.role,
      email: serverSession.user.email
    })

    return serverSession
  } catch (error) {
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
      userId: session.user.id
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
    // Force dynamic rendering by accessing headers
    await headers()
    
    logger.info('Fetching user by ID', { userId })

    const response = await fetch(`${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/api/users/${userId}`)
    
    if (!response.ok) {
      logger.error('Failed to fetch user:', {
        userId,
        status: response.status,
        statusText: response.statusText
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
      userName: data.user.name || data.user.email
    })

    return data.user
  } catch (error) {
    logger.error('Error fetching user by ID:', error)
    return null
  }
}

/**
 * Verify conversation permission between current user and recipient
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
      return true
    }

    // TODO: Add more sophisticated permission checks
    // For now, authenticated users can chat with anyone
    logger.info('Conversation permission granted', {
      currentUser: session.user.id,
      recipient: recipientId
    })
    
    return true
  } catch (error) {
    logger.error('Error verifying conversation permission:', error)
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
    action
  })
  
  return true
}