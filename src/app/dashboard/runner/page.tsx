import { Suspense } from 'react'

import { headers } from 'next/headers'

import DashboardRouter from '@/components/dashboard/DashboardRouter'
import { RunnerDashboardSkeleton } from '@/components/ui/LoadingSkeletons'
import { requireRunner } from '@/utils/auth-server'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

/**
 * Runner Dashboard Page (Server Component)
 *
 * Forces dynamic rendering and ensures only runners can access this route.
 * Server-side role validation provides better security and UX.
 */
export default async function RunnerDashboardPage() {
  // Force dynamic rendering prior to auth check
  await headers()

  // Server-side authentication and role validation - forces dynamic rendering
  const session = await requireRunner()

  // Pass authenticated runner data to Client Component wrapped in Suspense
  return (
    <Suspense fallback={<RunnerDashboardSkeleton />}>
      <DashboardRouter user={session.user} />
    </Suspense>
  )
}
