import { Suspense } from 'react'

import { redirect } from 'next/navigation'

import { WeeklyPlannerSkeleton } from '@/components/ui/LoadingSkeletons'
import { getServerSession } from '@/utils/auth-server'

import WeeklyPlannerClient from './WeeklyPlannerClient'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

/**
 * Weekly Planner Page (Server Component)
 *
 * Forces dynamic rendering and handles server-side authentication.
 * Coaches see the runner selection page, runners are redirected to their own planner.
 */
export default async function WeeklyPlannerPage() {
  // Server-side authentication
  const session = await getServerSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Runners are redirected to their own weekly planner
  if (session.user.userType === 'runner') {
    redirect(`/weekly-planner/${session.user.id}`)
  }

  // Only coaches can access this page
  if (session.user.userType !== 'coach') {
    redirect('/dashboard')
  }

  // Client Component handles runner selection UI - no user data needed
  return (
    <Suspense fallback={<WeeklyPlannerSkeleton />}>
      <WeeklyPlannerClient />
    </Suspense>
  )
}
