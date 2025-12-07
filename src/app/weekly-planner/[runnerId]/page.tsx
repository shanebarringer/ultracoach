import { Suspense } from 'react'

import { redirect } from 'next/navigation'

import { WeeklyPlannerRunnerSkeleton } from '@/components/ui/LoadingSkeletons'
import { getServerSession } from '@/utils/auth-server'

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
  // Server-side authentication
  const session = await getServerSession()

  if (!session) {
    redirect('/auth/signin')
  }

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

  // Pass authenticated user data and runnerId to Client Component wrapped in Suspense
  return (
    <Suspense fallback={<WeeklyPlannerRunnerSkeleton />}>
      <WeeklyPlannerRunnerClient user={session.user} runnerId={runnerId} />
    </Suspense>
  )
}
