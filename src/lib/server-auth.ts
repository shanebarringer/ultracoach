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
    
    // Map Better Auth ID to original UUID for database compatibility
    const originalUserId = await mapBetterAuthUserToOriginalUser(session.user.id)
    
    if (!originalUserId) {
      console.error('Could not map Better Auth user to original user:', session.user.id)
      return null
    }
    
    return {
      user: {
        id: originalUserId, // Use original UUID for database queries
        email: session.user.email,
        name: session.user.name,
        role: (session.user as { role?: string }).role || 'runner',
        betterAuthId: session.user.id // Keep Better Auth ID for reference
      }
    }
  } catch (error) {
    console.error('Server session error:', error)
    return null
  }
}