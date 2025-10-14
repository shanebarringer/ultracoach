import { Suspense } from 'react'

import { headers } from 'next/headers'

import { RacesPageSkeleton } from '@/components/ui/LoadingSkeletons'
import { requireAuth } from '@/utils/auth-server'

import RacesPageClient from './RacesPageClient'

/**
 * Races Page (Server Component)
 *
 * Forces dynamic rendering and handles authentication at the server level.
 * Following the Server/Client Component hybrid pattern for authenticated routes.
 */
export default async function RacesPage() {
  // Force dynamic rendering - CRITICAL for authenticated routes
  await headers()

  // Server-side authentication check
  await requireAuth()

  // Both coaches and runners can access races page
  // Client component wrapped in Suspense for better loading experience
  return (
    <Suspense fallback={<RacesPageSkeleton />}>
      <RacesPageClient />
    </Suspense>
  )
}
