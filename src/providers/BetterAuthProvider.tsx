'use client'

import { useSetAtom } from 'jotai'

import { useEffect } from 'react'

import { authLoadingAtom, sessionAtom, userAtom } from '@/lib/atoms/index'
import { authClient } from '@/lib/better-auth-client'
import type { Session, User } from '@/lib/better-auth-client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('BetterAuthProvider')

interface BetterAuthProviderProps {
  children: React.ReactNode
  initialSession?: Session | null
}

export function BetterAuthProvider({ children, initialSession }: BetterAuthProviderProps) {
  const setSession = useSetAtom(sessionAtom)
  const setUser = useSetAtom(userAtom)
  const setAuthLoading = useSetAtom(authLoadingAtom)

  useEffect(() => {
    // Only run on client side to prevent hydration issues
    if (typeof window === 'undefined') return

    // If we have an initial session from server, set it immediately (SSR optimization)
    if (initialSession) {
      logger.info('BetterAuthProvider: Using initial session from server (SSR optimization)', {
        userId: initialSession.user?.id,
        hasSession: !!initialSession,
      })
      setSession(initialSession)
      setUser(initialSession?.user ? (initialSession.user as User) : null)
      setAuthLoading(false)
    }

    // Unmount guard to prevent state updates after component cleanup
    let isActive = true

    // Track in-flight session checks with loading state to prevent race conditions
    let inFlightWithLoading = 0

    // Track background refresh to prevent overlapping calls
    let backgroundInFlight = false

    // Get session with optional loading state control
    // setLoading=true shows loading spinner (initial check)
    // setLoading=false runs silently (periodic background refresh, focus/visibility events)
    const getSession = async (setLoading = false) => {
      // Track this check if it should show loading
      if (setLoading && isActive) {
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
          if (isActive) {
            setSession(null)
            setUser(null)
          }
        } else if (session) {
          // Log session loaded without PII (no email)
          logger.info('Better Auth session loaded', {
            hasSession: true,
            userId: session.user?.id,
          })
          if (isActive) {
            setSession(session)
            setUser(session?.user ? (session.user as User) : null)
          }
        } else {
          // No session found, which is normal for unauthenticated users
          if (isActive) {
            setSession(null)
            setUser(null)
          }
        }
      } catch (error) {
        // Sanitize error logging - only log safe properties
        logger.warn('Session check failed (normal if not logged in)', {
          name: (error as Error)?.name,
          message: (error as Error)?.message,
        })
        if (isActive) {
          setSession(null)
          setUser(null)
        }
      } finally {
        if (setLoading && isActive) {
          inFlightWithLoading--
          if (inFlightWithLoading === 0) {
            setAuthLoading(false)
            logger.info('BetterAuthProvider: All session checks complete, loading state cleared')
          }
        }
      }
    }

    // Initial session check - only show loading if we don't have initialSession
    // If we have initialSession, run silent background refresh instead
    getSession(!initialSession)

    // Set up periodic session refresh to prevent staleness
    // Runs silently (no loading state) to avoid UI flicker every 30 seconds
    // Guard prevents overlapping calls on slow networks
    const refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !backgroundInFlight && isActive) {
        backgroundInFlight = true
        void getSession(false).finally(() => {
          backgroundInFlight = false
        })
      }
    }, 30000)

    // Refresh when user returns to the page - silent to avoid UX flicker
    // Use backgroundInFlight guard to prevent concurrent refreshes and race conditions
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !backgroundInFlight && isActive) {
        backgroundInFlight = true
        logger.info('Page became visible, refreshing session')
        void getSession(false).finally(() => {
          backgroundInFlight = false
        })
      }
    }

    const handleFocus = () => {
      if (!backgroundInFlight && isActive) {
        backgroundInFlight = true
        logger.info('Window gained focus, refreshing session')
        void getSession(false).finally(() => {
          backgroundInFlight = false
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    // Clean up interval and event listeners on unmount
    return () => {
      isActive = false // Prevent any further state updates
      clearInterval(refreshInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [setSession, setUser, setAuthLoading, initialSession])

  return <>{children}</>
}
