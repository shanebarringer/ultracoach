import { NextRequest } from 'next/server'

import { auth } from '@/lib/better-auth'
import { createLogger } from '@/lib/logger'

const logger = createLogger('server-auth')

export async function getServerSession(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      logger.debug('No session found')
      return null
    }

    // Database now uses Better Auth IDs directly - no mapping needed
    return {
      user: {
        id: session.user.id, // Use Better Auth ID directly for database queries
        email: session.user.email,
        name: session.user.name,
        userType: (session.user as { userType?: string }).userType || 'runner',
      },
    }
  } catch (error) {
    // Log different error types for better debugging
    if (error instanceof Error) {
      if (error.message.includes('ENETUNREACH')) {
        logger.error('Network unreachable - database connection failed:', error.message)
      } else if (error.message.includes('Connection terminated')) {
        logger.error('Database connection terminated:', error.message)
      } else if (error.message.includes('timeout')) {
        logger.error('Database connection timeout:', error.message)
      } else {
        logger.error('Server session error:', error)
      }
    } else {
      logger.error('Unknown server session error:', error)
    }
    return null
  }
}
