// Training plan types
import type { TrainingPlan } from '@/lib/supabase'

// Plan type constants and types
export const PLAN_TYPES = ['race_specific', 'base_building', 'bridge', 'recovery'] as const
export type PlanType = (typeof PLAN_TYPES)[number]

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  race_specific: 'Race Specific',
  base_building: 'Base Building',
  bridge: 'Bridge Plan',
  recovery: 'Recovery Plan',
}

// Goal type constants and types
export const GOAL_TYPES = ['completion', 'time', 'placement'] as const
export type GoalType = (typeof GOAL_TYPES)[number]

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  completion: 'Completion',
  time: 'Time Goal',
  placement: 'Placement Goal',
}

export interface ExtendedTrainingPlan extends TrainingPlan {
  phases?: TrainingPhase[]
  templates?: TrainingTemplate[]
  workouts?: ExtendedWorkout[]
}

export interface TrainingPhase {
  id: string
  name: string
  start_date: string
  end_date: string
  description?: string
}

export interface TrainingTemplate {
  id: string
  name: string
  description?: string
  weeks: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

export interface ExtendedWorkout {
  id: string
  date: string
  planned_type?: string
  actual_type?: string
  status?: string
  // Add other workout fields as needed
}
