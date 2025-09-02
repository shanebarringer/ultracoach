// Notification types
export interface Notification {
  id: string
  user_id: string
  type: 'workout' | 'message' | 'plan' | 'achievement' | 'system'
  title: string
  message: string
  read: boolean
  created_at: string
  updated_at?: string
  data?: Record<string, unknown>
}