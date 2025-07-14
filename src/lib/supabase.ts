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

export interface Race {
  id: string
  name: string
  date: string
  distance: string
  location: string
  terrain: string
  elevation_gain?: number
  created_at: string
}

export interface TrainingPlan {
  id: string
  title: string
  description?: string
  coach_id: string
  runner_id: string
  race_id?: string // New: Link to races table
  goal_type?: 'completion' | 'time' | 'placement' // New: Goal type
  plan_type?: 'race_specific' | 'base_building' | 'bridge' | 'recovery' // New: Type of plan
  target_race_date?: string // Now optional, as race_id can cover this
  target_race_distance?: string // Now optional, as race_id can cover this
  start_date?: string // New: Start date of the plan
  previous_plan_id?: string // New: For sequencing
  next_plan_id?: string // New: For sequencing
  created_at: string
  updated_at: string
  archived: boolean
  current_phase?: string
  progress?: number
  weeks_remaining?: number
}

export interface Workout {
  id: string
  training_plan_id: string
  date: string
  planned_distance?: number
  planned_duration?: number
  planned_type: string
  category?: 'easy' | 'tempo' | 'interval' | 'long_run' | 'race_simulation' | 'recovery' | 'strength' | 'cross_training' | 'rest'; // New: Workout category
  intensity?: number; // New: Intensity level (1-10)
  terrain?: 'road' | 'trail' | 'track' | 'treadmill'; // New: Terrain type
  elevation_gain?: number; // New: Elevation gain
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
  conversation_id: string
  sender_id: string
  recipient_id: string
  content: string
  read: boolean
  created_at: string
}

export interface MessageWithUser extends Message {
  sender: User
}

export interface Conversation {
  id: string
  sender_id: string
  recipient_id: string
  last_message_at: string
  created_at: string
}

export interface ConversationWithUser extends Conversation {
  sender: User
  recipient: User
  unreadCount: number
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

export interface PlanTemplate {
  id: string
  name: string
  description?: string
  distance_category: string // e.g., '50K', '100M'
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  created_at: string
}

export interface PlanPhase {
  id: string
  training_plan_id: string
  phase_name: string
  duration_weeks: number
  order: number
  created_at: string
}

export interface TemplatePhase {
  id: string
  template_id: string
  phase_name: string // e.g., 'Base', 'Build', 'Peak'
  duration_weeks: number
  order: number
  created_at: string
}