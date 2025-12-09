import { Suspense } from 'react'

import { redirect } from 'next/navigation'

import { TrainingPlanDetailSkeleton } from '@/components/ui/LoadingSkeletons'
import { requireAuth } from '@/utils/auth-server'

import TrainingPlanDetailClient from './TrainingPlanDetailClient'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

/**
 * Training Plan Detail Page (Server Component)
 *
 * Forces dynamic rendering and handles server-side authentication.
 * Both coaches and runners can view training plan details.
 */
export default async function TrainingPlanDetailPage({ params }: Props) {
  // Server-side authentication
  const session = await requireAuth()

  // Await params in Next.js 15
  const { id: planId } = await params

  if (!planId) {
    redirect('/training-plans')
  }

  // Pass authenticated user data and planId to Client Component wrapped in Suspense
  return (
    <Suspense fallback={<TrainingPlanDetailSkeleton />}>
      <TrainingPlanDetailClient user={session.user} planId={planId} />
    </Suspense>
  )
}
