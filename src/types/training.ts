// Training plan types
import type { TrainingPlan } from '@/lib/supabase'

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
