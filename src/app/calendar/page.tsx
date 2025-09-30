import { Suspense } from 'react'

import { headers } from 'next/headers'

import { WorkoutsPageSkeleton } from '@/components/ui/LoadingSkeletons'
import { requireAuth } from '@/utils/auth-server'

import CalendarPageClient from './CalendarPageClient'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

/**
 * Calendar Page (Server Component)
 *
 * Forces dynamic rendering and handles server-side authentication.
 * Server-side validation provides better security and UX.
 */
export default async function CalendarPage() {
  // Force dynamic rendering prior to auth check
  await headers()

  // Server-side authentication - forces dynamic rendering
  const session = await requireAuth()

  // Pass authenticated user data to Client Component wrapped in Suspense
  return (
    <Suspense fallback={<WorkoutsPageSkeleton />}>
      <CalendarPageClient user={session.user} />
    </Suspense>
  )
}
