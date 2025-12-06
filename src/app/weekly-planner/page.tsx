import { Suspense } from 'react'

import { headers } from 'next/headers'
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
  // Force dynamic rendering
  await headers()

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

  // Pass authenticated user data to Client Component wrapped in Suspense
  return (
    <Suspense fallback={<WeeklyPlannerSkeleton />}>
      <WeeklyPlannerClient user={session.user} />
    </Suspense>
  )
}
