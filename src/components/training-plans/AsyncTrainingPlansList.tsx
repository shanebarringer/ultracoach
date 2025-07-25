'use client'

import { Suspense } from 'react'
import { useAtom } from 'jotai'
import { Skeleton } from '@heroui/react'
import { asyncTrainingPlansAtom, uiStateAtom } from '@/lib/atoms'
import TrainingPlanCard from './TrainingPlanCard'
import type { TrainingPlan } from '@/lib/supabase'
// Session type no longer needed

interface AsyncTrainingPlansListProps {
  userRole: 'runner' | 'coach'
  onArchiveChange: () => void
}

interface TrainingPlansContentProps {
  userRole: 'runner' | 'coach'
  onArchiveChange: () => void
}

function TrainingPlansContent({ userRole, onArchiveChange }: TrainingPlansContentProps) {
  const [trainingPlans] = useAtom(asyncTrainingPlansAtom)
  const [uiState] = useAtom(uiStateAtom)

  // Filter plans based on archived status
  const filteredPlans = uiState.showArchived 
    ? trainingPlans 
    : trainingPlans.filter((p: TrainingPlan) => !p.archived)

  if (filteredPlans.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          {uiState.showArchived ? 'No archived training plans' : 'No training plans'}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {uiState.showArchived 
            ? 'No training plans have been archived yet.'
            : userRole === 'coach' 
              ? 'Get started by creating your first training plan.'
              : 'No training plans have been created for you yet.'
          }
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredPlans.map((plan: TrainingPlan) => (
        <TrainingPlanCard
          key={plan.id}
          plan={plan}
          userRole={userRole}
          onArchiveChange={onArchiveChange}
        />
      ))}
    </div>
  )
}

const LoadingFallback = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-2/3 rounded" />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-16 rounded" />
        </div>
      </div>
    ))}
  </div>
)

export default function AsyncTrainingPlansList({ userRole, onArchiveChange }: AsyncTrainingPlansListProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TrainingPlansContent 
        userRole={userRole} 
        onArchiveChange={onArchiveChange} 
      />
    </Suspense>
  )
}