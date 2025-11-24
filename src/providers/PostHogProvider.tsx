'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import { createLogger } from '@/lib/logger'

const logger = createLogger('PostHogProvider')

if (typeof window !== 'undefined') {
  // Initialize PostHog only on client side
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: 'identified_only', // Only create profiles for identified users
      capture_pageview: false, // Disable automatic pageview capture (we'll handle it manually)
      capture_pageleave: true, // Capture when users leave pages
      feature_flag_request_timeout_ms: 3000, // 3 second timeout for feature flags
      loaded: posthog => {
        if (process.env.NODE_ENV === 'development') {
          logger.debug('PostHog loaded successfully')
        }
      },
    })
  } else if (process.env.NODE_ENV === 'development') {
    logger.warn('PostHog API key not found. Feature flags will not work.')
  }
}

export function PostHogPageview(): JSX.Element {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`
      }
      posthog.capture('$pageview', {
        $current_url: url,
      })
    }
  }, [pathname, searchParams])

  return <></>
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>
}
