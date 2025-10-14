import { Suspense } from 'react'

import { headers } from 'next/headers'

import { TrainingPlansPageSkeleton } from '@/components/ui/LoadingSkeletons'
import { requireAuth } from '@/utils/auth-server'

import TrainingPlansPageClient from './TrainingPlansPageClient'

/**
 * Training Plans Page (Server Component)
 *
 * Forces dynamic rendering and handles server-side authentication.
 * Server-side validation provides better security and UX.
 */
export default async function TrainingPlansPage() {
  // Force dynamic rendering prior to auth check
  await headers()

  // Server-side authentication - this is the real security boundary
  const session = await requireAuth()

  // Pass authenticated user data to Client Component wrapped in Suspense
  // Provides consistent skeleton loading experience across all authenticated pages
  return (
    <Suspense fallback={<TrainingPlansPageSkeleton />}>
      <TrainingPlansPageClient user={session.user} />
    </Suspense>
  )
}
