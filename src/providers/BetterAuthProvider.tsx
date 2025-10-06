'use client'

import { useSetAtom } from 'jotai'

import { useEffect } from 'react'

import { authLoadingAtom, sessionAtom, userAtom } from '@/lib/atoms/index'
import { authClient } from '@/lib/better-auth-client'
import type { User } from '@/lib/better-auth-client'
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
        // CRITICAL: Always set loading to true at the start of session check
        // This ensures loading state is properly reset on each page navigation
        // (Jotai atoms persist across navigations in tests, so explicit reset needed)
        setAuthLoading(true)

        logger.info('BetterAuthProvider: Calling authClient.getSession()...')
        const { data: session, error } = await authClient.getSession()
        logger.info('BetterAuthProvider: getSession() returned:', {
          hasSession: !!session,
          hasError: !!error,
          email: session?.user?.email,
        })

        if (error) {
          // Don't log error for normal "no session" cases
          if (error.status !== 404 && error.status !== 401) {
            logger.error('Better Auth session error:', error)
          }
          logger.info('BetterAuthProvider: Setting session to null due to error')
          setSession(null)
          setUser(null)
        } else if (session) {
          logger.info('BetterAuthProvider: Setting session and user:', session.user?.email)
          setSession(session)
          setUser(session?.user ? (session.user as User) : null)
          logger.info('BetterAuthProvider: Session atoms updated successfully')
        } else {
          // No session found, which is normal for unauthenticated users
          logger.info('BetterAuthProvider: No session returned, setting to null')
          setSession(null)
          setUser(null)
        }
      } catch (error) {
        // Don't log network errors on homepage - it's normal not to have a session
        logger.warn(
          'BetterAuthProvider: Session check failed (this is normal if not logged in):',
          error
        )
        setSession(null)
        setUser(null)
      } finally {
        logger.info('BetterAuthProvider: Setting authLoading to false')
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
