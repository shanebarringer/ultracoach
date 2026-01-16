import { and, eq } from 'drizzle-orm'

import { Suspense } from 'react'

import { redirect } from 'next/navigation'

import { WeeklyPlannerRunnerSkeleton } from '@/components/ui/LoadingSkeletons'
import { db } from '@/lib/database'
import { coach_runners } from '@/lib/schema'
import { requireAuth } from '@/utils/auth-server'

import WeeklyPlannerRunnerClient from './WeeklyPlannerRunnerClient'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ runnerId: string }>
}

/**
 * Weekly Planner Runner Page (Server Component)
 *
 * Forces dynamic rendering and handles server-side authentication.
 * Coaches can view any runner's planner, runners can only view their own.
 */
export default async function WeeklyPlannerRunnerPage({ params }: Props) {
  // Server-side authentication - redirects to signin if not authenticated
  const session = await requireAuth()

  // Await params in Next.js 15
  const { runnerId } = await params

  if (!runnerId) {
    redirect('/weekly-planner')
  }

  // Allow both coaches and runners
  if (session.user.userType !== 'coach' && session.user.userType !== 'runner') {
    redirect('/dashboard')
  }

  // If runner, ensure they can only view their own training
  if (session.user.userType === 'runner' && session.user.id !== runnerId) {
    redirect(`/weekly-planner/${session.user.id}`)
  }

  // If coach viewing another user's schedule, verify active relationship exists
  if (session.user.userType === 'coach' && session.user.id !== runnerId) {
    const relationship = await db
      .select({ id: coach_runners.id })
      .from(coach_runners)
      .where(
        and(
          eq(coach_runners.coach_id, session.user.id),
          eq(coach_runners.runner_id, runnerId),
          eq(coach_runners.status, 'active')
        )
      )
      .limit(1)

    if (relationship.length === 0) {
      // Coach doesn't have an active relationship with this runner
      redirect('/runners?error=no_relationship')
    }
  }

  // Pass authenticated user data and runnerId to Client Component wrapped in Suspense
  return (
    <Suspense fallback={<WeeklyPlannerRunnerSkeleton />}>
      <WeeklyPlannerRunnerClient user={session.user} runnerId={runnerId} />
    </Suspense>
  )
}
