'use client'

import { useAtomValue } from 'jotai'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

import { useEffect } from 'react'

import { userAtom } from '@/lib/atoms/auth'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const user = useAtomValue(userAtom)

  useEffect(() => {
    // Only initialize PostHog in the browser and if API key is present
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        capture_pageview: false, // We'll manually capture pageviews
        capture_pageleave: true,
        // Disable in development unless explicitly enabled
        loaded: ph => {
          if (process.env.NODE_ENV === 'development') {
            ph.opt_out_capturing() // Opt out in dev by default
          }
        },
      })
    }

    // Cleanup on unmount
    return () => {
      if (typeof window !== 'undefined') {
        posthog.opt_out_capturing()
      }
    }
  }, [])

  // Identify user when available
  useEffect(() => {
    if (user?.id) {
      posthog.identify(user.id, {
        email: user.email,
        name: user.name,
        userType: user.userType,
      })
    } else {
      // Reset user when logged out
      posthog.reset()
    }
  }, [user])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
