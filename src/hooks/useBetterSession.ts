import { useAtom } from 'jotai'

import { authLoadingAtom, sessionAtom, userAtom } from '@/lib/atoms'
import { authClient } from '@/lib/better-auth-client'

export function useBetterSession() {
  const [session, setSession] = useAtom(sessionAtom)
  const [user, setUser] = useAtom(userAtom)
  const [loading, setLoading] = useAtom(authLoadingAtom)

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await authClient.signOut()

      if (error) {
        console.error('Sign out error:', error)
        return { success: false, error: error.message }
      }

      // Clear atoms
      setSession(null)
      setUser(null)

      return { success: true }
    } catch (error) {
      console.error('Sign out error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Sign out failed' }
    } finally {
      setLoading(false)
    }
  }

  const refreshSession = async () => {
    try {
      const { data: session, error } = await authClient.getSession()

      if (error) {
        console.error('Session refresh error:', error)
        setSession(null)
        setUser(null)
        return { success: false, error: error.message }
      }

      setSession(session as Record<string, unknown>)
      setUser((session?.user as Record<string, unknown>) || null)

      return { success: true, session }
    } catch (error) {
      console.error('Session refresh error:', error)
      setSession(null)
      setUser(null)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session refresh failed',
      }
    }
  }

  return {
    session,
    user,
    loading,
    signOut,
    refreshSession,
  }
}

// Compatibility hook for existing code that uses NextAuth structure
export function useSession() {
  const { session, user, loading } = useBetterSession()

  return {
    data: session
      ? {
          user: {
            id: (user?.id as string) || '',
            email: (user?.email as string) || '',
            name: (user?.name as string) || '',
            role: (user?.role as 'runner' | 'coach') || 'runner',
          },
        }
      : null,
    status: loading ? 'loading' : session ? 'authenticated' : 'unauthenticated',
  }
}
