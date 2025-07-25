'use client'

import { useAtom } from 'jotai'

import { useEffect } from 'react'

import { authLoadingAtom, sessionAtom, userAtom } from '@/lib/atoms'
import { authClient } from '@/lib/better-auth-client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('BetterAuthProvider')

export function BetterAuthProvider({ children }: { children: React.ReactNode }) {
  const [, setSession] = useAtom(sessionAtom)
  const [, setUser] = useAtom(userAtom)
  const [, setAuthLoading] = useAtom(authLoadingAtom)

  useEffect(() => {
    // Only run on client side to prevent hydration issues
    if (typeof window === 'undefined') return

    // Get initial session
    const getSession = async () => {
      try {
        const { data: session, error } = await authClient.getSession()

        if (error) {
          // Don't log error for normal "no session" cases
          if (error.status !== 404 && error.status !== 401) {
            logger.error('Better Auth session error:', error)
          }
          setSession(null)
          setUser(null)
        } else if (session) {
          logger.info('Better Auth session restored:', session.user?.email)
          setSession(session)
          setUser(session?.user || null)
        } else {
          // No session found, which is normal for unauthenticated users
          setSession(null)
          setUser(null)
        }
      } catch (error) {
        // Don't log network errors on homepage - it's normal not to have a session
        logger.warn('Better Auth session check failed (this is normal if not logged in):', error)
        setSession(null)
        setUser(null)
      } finally {
        setAuthLoading(false)
      }
    }

    getSession()
  }, [setSession, setUser, setAuthLoading])

  return <>{children}</>
}
