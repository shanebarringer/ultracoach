import Link from 'next/link'
import type { TrainingPlan, User } from '@/lib/supabase'

interface TrainingPlanCardProps {
  plan: TrainingPlan & { runners?: User; coaches?: User }
  userRole: 'runner' | 'coach'
}

export default function TrainingPlanCard({ plan, userRole }: TrainingPlanCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{plan.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Created</div>
          <div className="text-sm font-medium text-gray-900">
            {formatDate(plan.created_at)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {plan.target_race_date && (
          <div>
            <div className="text-xs text-gray-500">Target Race</div>
            <div className="text-sm font-medium text-gray-900">
              {formatDate(plan.target_race_date)}
            </div>
          </div>
        )}
        {plan.target_race_distance && (
          <div>
            <div className="text-xs text-gray-500">Distance</div>
            <div className="text-sm font-medium text-gray-900">
              {plan.target_race_distance}
            </div>
          </div>
        )}
      </div>

      <div className="mb-4">
        {userRole === 'coach' && plan.runners && (
          <div>
            <div className="text-xs text-gray-500">Runner</div>
            <div className="text-sm font-medium text-gray-900">
              {plan.runners.full_name}
            </div>
          </div>
        )}
        {userRole === 'runner' && plan.coaches && (
          <div>
            <div className="text-xs text-gray-500">Coach</div>
            <div className="text-sm font-medium text-gray-900">
              {plan.coaches.full_name}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Active
          </span>
        </div>
        <Link
          href={`/training-plans/${plan.id}`}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          View Details →
        </Link>
      </div>
    </div>
  )
}