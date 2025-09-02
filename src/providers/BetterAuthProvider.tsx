'use client'

import { useSetAtom } from 'jotai'

import { useEffect } from 'react'

import { authLoadingAtom, sessionAtom, userAtom } from '@/lib/atoms/index'
import { authClient } from '@/lib/better-auth-client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('BetterAuthProvider')

export function BetterAuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useSetAtom(sessionAtom)
  const setUser = useSetAtom(userAtom)
  const setAuthLoading = useSetAtom(authLoadingAtom)

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

    // Get initial session
    getSession()

    // Set up periodic session refresh to prevent staleness
    // This helps fix the issue where users need manual refresh after login
    const refreshInterval = setInterval(() => {
      // Only refresh if we have a session and page is visible
      if (document.visibilityState === 'visible') {
        getSession()
      }
    }, 30000) // Refresh every 30 seconds when page is visible

    // Also refresh when user returns to the page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        logger.info('Page became visible, refreshing session')
        getSession()
      }
    }

    const handleFocus = () => {
      logger.info('Window gained focus, refreshing session')
      getSession()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    // Clean up interval and event listeners on unmount
    return () => {
      clearInterval(refreshInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [setSession, setUser, setAuthLoading])

  return <>{children}</>
}
