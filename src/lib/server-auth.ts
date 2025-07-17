import { NextRequest } from 'next/server'
import { auth } from '@/lib/better-auth'
import { createLogger } from '@/lib/logger'

const logger = createLogger('server-auth')

export async function getServerSession(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session) {
      return null
    }
    
    // Database now uses Better Auth IDs directly - no mapping needed
    return {
      user: {
        id: session.user.id, // Use Better Auth ID directly for database queries
        email: session.user.email,
        name: session.user.name,
        role: (session.user as { role?: string }).role || 'runner'
      }
    }
  } catch (error) {
    logger.error('Server session error:', error)
    return null
  }
}