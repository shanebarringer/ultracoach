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

export interface RaceNotificationData {
  race_id: string
}

export interface AchievementNotificationData {
  achievement_id: string
  achievement_type: string
}

export type NotificationData =
  | MessageNotificationData
  | WorkoutNotificationData
  | TrainingPlanNotificationData
  | RaceNotificationData
  | AchievementNotificationData
  | Record<string, unknown>

// Exhaustive notification type union matching all backend types
export type NotificationType =
  | 'message'
  | 'workout'
  | 'plan'
  | 'training_plan' // Legacy backend type
  | 'race'
  | 'achievement'
  | 'system'

// Notification types
export interface Notification {
  id: string
  user_id: string
  type: NotificationType
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

export function isRaceNotification(
  notification: Notification
): notification is Notification & { data: RaceNotificationData } {
  return notification.type === 'race' && !!notification.data && 'race_id' in notification.data
}

export function isAchievementNotification(
  notification: Notification
): notification is Notification & { data: AchievementNotificationData } {
  return (
    notification.type === 'achievement' &&
    !!notification.data &&
    'achievement_id' in notification.data
  )
}
