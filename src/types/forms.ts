// Form Validation Schemas and Types
import { z } from 'zod'

// Auth Forms
export const signUpSchema = z.object({
  fullName: z
    .string()
    .min(1, { message: 'Full name is required' })
    .min(2, { message: 'Full name must be at least 2 characters' }),
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' }),
  password: z
    .string()
    .min(1, { message: 'Password is required' })
    .min(8, { message: 'Password must be at least 8 characters' }),
  role: z.enum(['runner', 'coach'], { message: 'Please select your role' }),
})

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' }),
  password: z
    .string()
    .min(1, { message: 'Password is required' })
    .min(6, { message: 'Password must be at least 6 characters' }),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

// Workout Forms
export const workoutFormSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().optional(),
  scheduledDate: z.string().min(1, { message: 'Date is required' }),
  category: z.enum([
    'easy',
    'tempo',
    'interval',
    'long_run',
    'race_simulation',
    'recovery',
    'cross_training',
  ]),
  intensity: z.number().min(1).max(10).optional(),
  targetTime: z.number().positive().optional(),
  targetDistance: z.number().positive().optional(),
  terrain: z.enum(['road', 'trail', 'track', 'treadmill', 'mixed']).optional(),
})

export const workoutLogSchema = z.object({
  completed: z.boolean(),
  actualTime: z.number().positive().optional(),
  actualDistance: z.number().positive().optional(),
  heartRateAvg: z.number().positive().optional(),
  elevationGain: z.number().nonnegative().optional(),
  notes: z.string().optional(),
})

// Training Plan Forms
export const trainingPlanFormSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().optional(),
  startDate: z.string().min(1, { message: 'Start date is required' }),
  endDate: z.string().min(1, { message: 'End date is required' }),
  goal: z.string().optional(),
  targetRaceId: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  weeklyMileage: z.number().positive().optional(),
})

// Message Forms
export const messageFormSchema = z.object({
  content: z
    .string()
    .min(1, { message: 'Message cannot be empty' })
    .max(5000, { message: 'Message too long' }),
  workoutId: z.string().optional(),
})

// Settings Forms
export const profileSettingsSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Invalid email address' }),
  image: z.string().url().optional(),
})

export const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  workoutReminders: z.boolean(),
  messageAlerts: z.boolean(),
  weeklyReports: z.boolean(),
})

export const privacySettingsSchema = z.object({
  profileVisibility: z.enum(['public', 'coaches_only', 'private']),
  activityVisibility: z.enum(['public', 'coaches_only', 'private']),
  shareWithStrava: z.boolean(),
})

// Type exports
export type SignUpForm = z.infer<typeof signUpSchema>
export type SignInForm = z.infer<typeof signInSchema>
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>
export type WorkoutForm = z.infer<typeof workoutFormSchema>
export type WorkoutLogForm = z.infer<typeof workoutLogSchema>
export type TrainingPlanForm = z.infer<typeof trainingPlanFormSchema>
export type MessageForm = z.infer<typeof messageFormSchema>
export type ProfileSettingsForm = z.infer<typeof profileSettingsSchema>
export type NotificationSettingsForm = z.infer<typeof notificationSettingsSchema>
export type PrivacySettingsForm = z.infer<typeof privacySettingsSchema>
