import { NextRequest } from 'next/server'
import { auth } from '@/lib/better-auth'
import { mapBetterAuthUserToOriginalUser } from '@/lib/user-mapping'

export async function getServerSession(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session) {
      return null
    }
    
    // Map Better Auth user ID to original user ID for database queries
    const originalUserId = await mapBetterAuthUserToOriginalUser(session.user.id)
    
    return {
      user: {
        id: originalUserId || session.user.id, // Fall back to Better Auth ID if mapping fails
        betterAuthId: session.user.id, // Keep Better Auth ID for reference
        email: session.user.email,
        name: session.user.name,
        role: (session.user as { role?: string }).role || 'runner'
      }
    }
  } catch (error) {
    console.error('Server session error:', error)
    return null
  }
}