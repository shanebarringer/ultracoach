'use client'

import { usePostHogIdentify } from '@/hooks/usePostHogIdentify'

/**
 * Component that identifies users with PostHog when they're authenticated
 * Add this to your authenticated layout or dashboard
 *
 * This component doesn't render anything - it just handles user identification
 */
export function PostHogIdentifier() {
  usePostHogIdentify()
  return null
}
