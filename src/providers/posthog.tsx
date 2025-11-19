'use client'

import { useSetAtom } from 'jotai'
import posthog from 'posthog-js'

import { useEffect, useState } from 'react'

import { usePathname, useSearchParams } from 'next/navigation'

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

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isInitialized, setIsInitialized] = useState(false)

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

            // Mark as initialized after loaded callback
            setIsInitialized(true)
            posthogInitialized = true
            logger.info('PostHog initialized successfully')

            // Initialize feature flags in Jotai atoms
            try {
              setFlagsLoading(true)

              // Wait for feature flags to load
              // Note: PostHog doesn't provide a method to enumerate all flags
              // Individual flags are fetched on-demand when components request them
              ph.onFeatureFlags(() => {
                // Mark flags as loaded - individual flags will be fetched when requested
                setFlags(new Map())
                logger.info('Feature flags system initialized and ready')
              })
            } catch (error) {
              logger.error('Failed to load feature flags:', error)
              setFlagsError(error instanceof Error ? error : new Error('Failed to load flags'))
            }
          },
        })
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
