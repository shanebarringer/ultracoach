'use client'

import posthog from 'posthog-js'

import { useEffect } from 'react'

import { usePathname, useSearchParams } from 'next/navigation'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Only initialize PostHog on client-side with proper environment variables
    if (typeof window !== 'undefined') {
      const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
      const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

      if (!apiKey) {
        console.warn('PostHog API key not found. Analytics disabled.')
        return
      }

      // Initialize PostHog
      posthog.init(apiKey, {
        api_host: apiHost || 'https://us.i.posthog.com',
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
          enabled: true,
          capture_unhandled_promise_rejections: true,
          capture_unhandled_errors: true,
        },
        // Respect Do Not Track
        respect_dnt: true,
        // Disable in development unless explicitly enabled
        loaded: posthog => {
          if (process.env.NODE_ENV === 'development') {
            posthog.opt_out_capturing() // Opt out in development
          }
        },
      })
    }
  }, [])

  // Track pageviews on route changes
  useEffect(() => {
    if (pathname && posthog.has_opted_in_capturing()) {
      let url = window.origin + pathname
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`
      }
      posthog.capture('$pageview', {
        $current_url: url,
      })
    }
  }, [pathname, searchParams])

  return <>{children}</>
}
