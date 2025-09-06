import { useAtom } from 'jotai'

import { authLoadingAtom, sessionAtom, userAtom } from '@/lib/atoms/index'
import { authClient } from '@/lib/better-auth-client'
import type { User } from '@/lib/better-auth-client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useBetterSession')

export function useBetterSession() {
  const [session, setSession] = useAtom(sessionAtom)
  const [user, setUser] = useAtom(userAtom)
  const [loading, setLoading] = useAtom(authLoadingAtom)

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await authClient.signOut()

      if (error) {
        logger.error('Sign out failed:', error)
        return { success: false, error: error.message }
      }

      // Clear atoms
      setSession(null)
      setUser(null)

      return { success: true }
    } catch (error) {
      logger.error('Sign out exception:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Sign out failed' }
    } finally {
      setLoading(false)
    }
  }

  const refreshSession = async () => {
    try {
      const { data: session, error } = await authClient.getSession()

      if (error) {
        logger.error('Session refresh failed:', error)
        setSession(null)
        setUser(null)
        return { success: false, error: error.message }
      }

      setSession(session)
      setUser(session?.user ? (session.user as User) : null)

      return { success: true, session }
    } catch (error) {
      logger.error('Session refresh exception:', error)
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
            role: (user?.userType as 'runner' | 'coach') || 'runner',
            userType: (user?.userType as 'runner' | 'coach') || 'runner',
          },
        }
      : null,
    status: loading ? 'loading' : session ? 'authenticated' : 'unauthenticated',
  }
}
