import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For server-side operations with elevated privileges
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key'
)

// Database types
export interface User {
  id: string
  email: string
  role: 'runner' | 'coach'
  full_name: string
  created_at: string
  updated_at: string
}

export interface TrainingPlan {
  id: string
  title: string
  description: string
  coach_id: string
  runner_id: string
  target_race_date: string
  target_race_distance: string
  created_at: string
  updated_at: string
  archived: boolean // Added for archive/delete UI
}

export interface Workout {
  id: string
  training_plan_id: string
  date: string
  planned_distance: number
  planned_duration: number
  planned_type: string
  actual_distance?: number
  actual_duration?: number
  actual_type?: string
  injury_notes?: string
  workout_notes?: string
  coach_feedback?: string
  status: 'planned' | 'completed' | 'skipped'
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  read: boolean
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'message' | 'workout' | 'comment'
  title: string
  message: string
  read: boolean
  created_at: string
}