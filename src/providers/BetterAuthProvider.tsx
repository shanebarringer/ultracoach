'use client'

import { useSetAtom } from 'jotai'
import { useHydrateAtoms } from 'jotai/utils'

import { type ReactNode, useEffect } from 'react'

import { authLoadingAtom, sessionAtom, userAtom } from '@/lib/atoms/index'
import { authClient } from '@/lib/better-auth-client'
import type { Session, User } from '@/lib/better-auth-client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('BetterAuthProvider')

interface BetterAuthProviderProps {
  children: ReactNode
  initialSession?: Session | null
}

export function BetterAuthProvider({ children, initialSession }: BetterAuthProviderProps) {
  // Synchronously hydrate session atoms BEFORE any rendering
  // This eliminates race condition where Header renders before useEffect completes
  useHydrateAtoms([
    [sessionAtom, initialSession || null],
    [userAtom, initialSession?.user ? (initialSession.user as User) : null],
    [authLoadingAtom, false],
  ])

  const setSession = useSetAtom(sessionAtom)
  const setUser = useSetAtom(userAtom)

  useEffect(() => {
    // Only run on client side to prevent hydration issues
    if (typeof window === 'undefined') return

    // Unmount guard to prevent state updates after component cleanup
    let isActive = true

    // Track background refresh to prevent overlapping calls
    let backgroundInFlight = false

    // Background session refresh (no loading state)
    // Used for periodic refresh and visibility/focus events
    const getSession = async () => {
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
          // Log session loaded without PII (no email, no userId)
          logger.info('Better Auth session refreshed', { hasSession: true })
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
        logger.warn('Session refresh failed (normal if not logged in)', {
          name: (error as Error)?.name,
          message: (error as Error)?.message,
        })
        if (isActive) {
          setSession(null)
          setUser(null)
        }
      }
    }

    // DRY helper: runs background refresh with guard to prevent overlapping calls
    const runBackgroundRefresh = () => {
      if (backgroundInFlight || !isActive) return
      backgroundInFlight = true
      void getSession().finally(() => {
        backgroundInFlight = false
      })
    }

    // Only run background refresh if we had an initial session
    // (to catch any server/client session drift)
    // Guard prevents race condition with near-immediate focus/visibility triggers
    runBackgroundRefresh()

    // Set up periodic session refresh to prevent staleness
    // Runs silently (no loading state) to avoid UI flicker every 30 seconds
    const refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        runBackgroundRefresh()
      }
    }, 30000)

    // Refresh when user returns to the page - silent to avoid UX flicker
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        logger.debug('Page became visible, refreshing session')
        runBackgroundRefresh()
      }
    }

    const handleFocus = () => {
      if (isActive) {
        logger.debug('Window gained focus, refreshing session')
        runBackgroundRefresh()
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
  }, [setSession, setUser, initialSession])

  return <>{children}</>
}
