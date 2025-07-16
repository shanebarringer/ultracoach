import { NextRequest } from 'next/server'
import { auth } from '@/lib/better-auth'

export async function getServerSession(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session) {
      return null
    }
    
    // Use Better Auth ID directly - no mapping needed after migration
    return {
      user: {
        id: session.user.id, // Better Auth ID is now the primary ID
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