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

    // Track in-flight session checks with loading state to prevent race conditions
    let inFlightWithLoading = 0

    // Get session with optional loading state control
    // setLoading=true shows loading spinner (initial check, user returns to page)
    // setLoading=false runs silently (periodic background refresh)
    const getSession = async (setLoading = false) => {
      // Track this check if it should show loading
      if (setLoading) {
        inFlightWithLoading++
        if (inFlightWithLoading === 1) {
          // Only set loading on the first in-flight check
          setAuthLoading(true)
          logger.info('BetterAuthProvider: Starting session check with loading state')
        }
      }
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
          logger.info('Better Auth session loaded:', session.user?.email)
          setSession(session)
          setUser(session?.user ? (session.user as User) : null)
        } else {
          // No session found, which is normal for unauthenticated users
          setSession(null)
          setUser(null)
        }
      } catch (error) {
        // Don't log network errors on homepage - it's normal not to have a session
        logger.warn('Session check failed (normal if not logged in):', error)
        setSession(null)
        setUser(null)
      } finally {
        if (setLoading) {
          inFlightWithLoading--
          if (inFlightWithLoading === 0) {
            setAuthLoading(false)
            logger.info('BetterAuthProvider: All session checks complete, loading state cleared')
          }
        }
      }
    }

    // Initial session check - show loading state
    getSession(true)

    // Set up periodic session refresh to prevent staleness
    // Runs silently (no loading state) to avoid UI flicker every 30 seconds
    const refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        getSession(false) // Silent background refresh
      }
    }, 30000)

    // Refresh when user returns to the page - show loading state
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        logger.info('Page became visible, refreshing session')
        getSession(true) // Show loading when user returns
      }
    }

    const handleFocus = () => {
      logger.info('Window gained focus, refreshing session')
      getSession(true) // Show loading when window regains focus
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
