// Notification data types
export interface MessageNotificationData {
  sender_id: string
  message_id: string
}

export interface WorkoutNotificationData {
  workout_id: string
}

export interface TrainingPlanNotificationData {
  plan_id: string
}

export type NotificationData =
  | MessageNotificationData
  | WorkoutNotificationData
  | TrainingPlanNotificationData
  | Record<string, unknown>

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
  data?: NotificationData
}

// Type guards
export function isMessageNotification(
  notification: Notification
): notification is Notification & { data: MessageNotificationData } {
  return notification.type === 'message' && !!notification.data && 'sender_id' in notification.data
}

export function isWorkoutNotification(
  notification: Notification
): notification is Notification & { data: WorkoutNotificationData } {
  return notification.type === 'workout' && !!notification.data && 'workout_id' in notification.data
}

export function isTrainingPlanNotification(
  notification: Notification
): notification is Notification & { data: TrainingPlanNotificationData } {
  return notification.type === 'plan' && !!notification.data && 'plan_id' in notification.data
}
