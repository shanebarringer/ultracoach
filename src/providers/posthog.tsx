'use client'

import { useSetAtom } from 'jotai'
import posthog from 'posthog-js'

import { useEffect, useState } from 'react'

import { usePathname, useSearchParams } from 'next/navigation'

import { COMMON_FEATURE_FLAGS } from '@/config/posthog-flags'
import {
  setFeatureFlagsAtom,
  setFeatureFlagsErrorAtom,
  setFeatureFlagsLoadingAtom,
} from '@/lib/atoms/feature-flags'
import { createLogger } from '@/lib/logger'

const logger = createLogger('PostHogProvider')

// Module-level flag to track PostHog initialization
// This prevents re-initialization during hot module reloading or strict mode double-mounting
let posthogInitialized = false

export function PostHogProvider({
  children,
  nonce: _nonce,
}: {
  children: React.ReactNode
  nonce?: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isInitialized, setIsInitialized] = useState(false)

  // Note: nonce parameter (_nonce) is reserved for future use if PostHog needs to load external scripts
  // Currently, PostHog SDK loads scripts dynamically via JavaScript, which Next.js
  // handles automatically when nonce is set in middleware request headers
  // The underscore prefix indicates this is an intentionally unused parameter for future CSP compliance

  // Jotai setters for feature flags
  const setFlags = useSetAtom(setFeatureFlagsAtom)
  const setFlagsLoading = useSetAtom(setFeatureFlagsLoadingAtom)
  const setFlagsError = useSetAtom(setFeatureFlagsErrorAtom)

  // Initialize PostHog only once on mount
  useEffect(() => {
    // Only initialize PostHog on client-side with proper environment variables
    // Check both component state and module-level initialization flag to prevent re-initialization
    // during hot module reloading or strict mode double-mounting
    if (typeof window !== 'undefined' && !isInitialized && !posthogInitialized) {
      const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
      const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

      if (!apiKey) {
        logger.warn('PostHog API key not found. Analytics disabled.')
        return
      }

      try {
        // Initialize PostHog
        posthog.init(apiKey, {
          api_host: apiHost || 'https://us.i.posthog.com',
          defaults: '2025-05-24', // Use PostHog's latest defaults for best compatibility
          person_profiles: 'identified_only', // Only create profiles for identified users
          capture_pageview: false, // We'll manually capture pageviews
          capture_pageleave: true, // Automatically capture when users leave pages
          autocapture: {
            // Capture clicks, form submissions, and other interactions
            dom_event_allowlist: ['click', 'change', 'submit'],
            // Don't capture sensitive data
            capture_copied_text: false,
          },
          // Enable session recording with privacy controls
          session_recording: {
            maskAllInputs: true, // Mask all input fields by default
            maskTextSelector: '[data-private]', // Mask elements with data-private attribute
            recordCrossOriginIframes: false,
          },
          // Enable error tracking
          capture_exceptions: {
            capture_unhandled_rejections: true,
            capture_unhandled_errors: true,
            capture_console_errors: true,
          },
          // Respect Do Not Track
          respect_dnt: true,
          // Disable in development unless explicitly enabled
          loaded: ph => {
            if (process.env.NODE_ENV === 'development') {
              ph.opt_out_capturing() // Opt out in development
            }

            // Mark as ready after loaded callback (preserves "ready" state distinction)
            setIsInitialized(true)
            logger.info('PostHog initialized successfully')

            // Initialize feature flags in Jotai atoms
            try {
              setFlagsLoading(true)

              // Wait for feature flags to load
              // PostHog doesn't provide enumeration, but we can fetch common flags eagerly
              ph.onFeatureFlags(() => {
                try {
                  // Common feature flags to pre-fetch (configured in @/config/posthog-flags.ts)
                  const flagsMap = new Map<string, boolean | string>()

                  // Fetch each common flag and populate the Map
                  COMMON_FEATURE_FLAGS.forEach(flagKey => {
                    const value = ph.getFeatureFlag(flagKey)
                    if (value !== undefined) {
                      flagsMap.set(flagKey, value as boolean | string)
                      logger.debug(`Pre-fetched feature flag: ${flagKey}`, { value })
                    }
                  })

                  // Set the flags Map in Jotai atom
                  setFlags(flagsMap)
                  logger.info('Feature flags system initialized', {
                    preloadedFlagsCount: flagsMap.size,
                  })
                } catch (flagError) {
                  logger.error('Failed to pre-fetch feature flags:', flagError)
                  // Still set empty Map so system is marked as ready
                  setFlags(new Map())
                }
              })
            } catch (error) {
              logger.error('Failed to load feature flags:', error)
              setFlagsError(error instanceof Error ? error : new Error('Failed to load flags'))
            }
          },
        })

        // CRITICAL: Set initialization flag immediately (synchronously) to prevent
        // React Strict Mode from re-running the effect before the async loaded callback
        posthogInitialized = true
      } catch (error) {
        logger.error('Failed to initialize PostHog:', error)
        posthogInitialized = false
        setFlagsError(error instanceof Error ? error : new Error('Failed to initialize PostHog'))
        // Ensure PostHog is opted out on initialization failure
        try {
          posthog.opt_out_capturing()
        } catch {
          // Silently fail if opt_out also fails
        }
      }
    }
    // Empty deps array intentional: we only want to initialize PostHog once on mount
    // isInitialized is checked but not included to prevent re-initialization
    // Jotai setters (setFlags, setFlagsLoading, setFlagsError) are stable and don't need to be included
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Track pageviews on route changes
  useEffect(() => {
    // Only track if PostHog is initialized and user has opted in
    if (!isInitialized || !pathname) {
      return
    }

    try {
      if (posthog.has_opted_in_capturing()) {
        let url = window.origin + pathname
        if (searchParams && searchParams.toString()) {
          url = url + `?${searchParams.toString()}`
        }
        posthog.capture('$pageview', {
          $current_url: url,
        })
      }
    } catch (error) {
      logger.error('Failed to capture pageview:', error)
    }
  }, [pathname, searchParams, isInitialized])

  return <>{children}</>
}
