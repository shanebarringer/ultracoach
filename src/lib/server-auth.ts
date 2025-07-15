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
    
    return {
      user: {
        id: session.user.id,
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