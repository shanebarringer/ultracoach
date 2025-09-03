'use client'

import { useAtom } from 'jotai'

import { useEffect } from 'react'

import { useSearchParams } from 'next/navigation'

import { stravaActivitiesRefreshableAtom, stravaConnectionStatusAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'

const logger = createLogger('useStravaOAuthReturn')

/**
 * Hook to handle Strava OAuth return and refresh connection status
 * Checks for success/error query parameters and refreshes atoms accordingly
 */
export function useStravaOAuthReturn(onSuccess?: () => void) {
  const searchParams = useSearchParams()
  const [, setConnectionStatus] = useAtom(stravaConnectionStatusAtom)
  const [, refreshActivities] = useAtom(stravaActivitiesRefreshableAtom)

  useEffect(() => {
    const success = searchParams?.get('success')
    const error = searchParams?.get('error')

    if (success === 'strava_connected') {
      logger.info('Strava OAuth success detected, refreshing connection status')
      // Update connection status and refresh activities
      setConnectionStatus({ status: 'connected', connected: true })
      refreshActivities()
      // Call custom callback if provided (for settings page refresh)
      onSuccess?.()
      toast.success('Successfully connected to Strava!')

      // Clean up URL by removing query parameters
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.delete('success')
        window.history.replaceState({}, '', url.toString())
      }
    } else if (error) {
      logger.warn('Strava OAuth error detected:', error)
      const errorMessages: Record<string, string> = {
        strava_not_configured: 'Strava integration is not configured',
        strava_access_denied: 'Strava access was denied',
        strava_invalid_callback: 'Invalid callback from Strava',
        strava_invalid_state: 'Invalid security state',
        strava_state_expired: 'Connection request expired, please try again',
        strava_user_not_found: 'User not found',
        strava_token_failed: 'Failed to get access token',
        strava_already_connected: 'This Strava account is already connected to another user',
        strava_callback_failed: 'Failed to process Strava connection',
      }

      const message = errorMessages[error] || 'Failed to connect to Strava'
      toast.error(message)

      // Clean up URL by removing query parameters
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.delete('error')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [searchParams, setConnectionStatus, refreshActivities, onSuccess])
}
