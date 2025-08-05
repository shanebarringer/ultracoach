import { addToast } from '@heroui/react'

/**
 * Toast notification utilities for UltraCoach
 * Uses HeroUI's native toast system for consistent, beautiful notifications
 */

export const toast = {
  /**
   * Show a success toast message
   */
  success: (title: string, description?: string) => {
    return addToast({
      title,
      description,
      color: 'success',
      timeout: 4000,
    })
  },

  /**
   * Show an error toast message
   */
  error: (title: string, description?: string) => {
    return addToast({
      title,
      description,
      color: 'danger',
      timeout: 6000, // Longer duration for errors
    })
  },

  /**
   * Show an info toast message
   */
  info: (title: string, description?: string) => {
    return addToast({
      title,
      description,
      color: 'primary',
      timeout: 4000,
    })
  },

  /**
   * Show a warning toast message
   */
  warning: (title: string, description?: string) => {
    return addToast({
      title,
      description,
      color: 'warning',
      timeout: 5000,
    })
  },

  /**
   * Show a default toast message
   */
  default: (title: string, description?: string) => {
    return addToast({
      title,
      description,
      color: 'default',
      timeout: 4000,
    })
  },

  /**
   * Show a custom toast with full control
   */
  custom: (options: Parameters<typeof addToast>[0]) => {
    return addToast(options)
  },
}

/**
 * Common toast messages for UltraCoach
 */
export const commonToasts = {
  // Authentication
  loginSuccess: () => toast.success('Welcome back!', 'Successfully signed in to your account'),
  loginError: (error?: string) =>
    toast.error('Sign in failed', error || 'Please check your credentials and try again'),
  logoutSuccess: () => toast.success('Signed out', 'You have been successfully signed out'),

  // Training Plans
  trainingPlanCreated: () =>
    toast.success('Training plan created!', 'Your new training plan is ready'),
  trainingPlanSaved: () =>
    toast.success('Training plan saved', 'Your changes have been saved successfully'),
  trainingPlanDeleted: () =>
    toast.success('Training plan deleted', 'The training plan has been removed'),
  trainingPlanError: (error?: string) =>
    toast.error('Training plan error', error || 'Unable to save training plan'),

  // Workouts
  workoutSaved: () => toast.success('Workout saved', 'Your workout has been saved successfully'),
  workoutCompleted: () => toast.success('Great job!', 'Your workout has been marked as completed'),
  workoutError: (error?: string) => toast.error('Workout error', error || 'Unable to save workout'),

  // Profile
  profileSaved: () => toast.success('Profile updated', 'Your profile changes have been saved'),
  profileError: (error?: string) =>
    toast.error('Profile error', error || 'Unable to save profile changes'),

  // General
  saveSuccess: () => toast.success('Saved successfully', 'Your changes have been saved'),
  saveError: (error?: string) => toast.error('Save failed', error || 'Unable to save changes'),
  deleteSuccess: () => toast.success('Deleted successfully', 'Item has been removed'),
  deleteError: (error?: string) => toast.error('Delete failed', error || 'Unable to delete item'),
  copySuccess: () =>
    toast.success('Copied to clipboard', 'Content has been copied to your clipboard'),

  // Network
  networkError: () =>
    toast.error('Connection error', 'Please check your internet connection and try again'),
  serverError: () =>
    toast.error('Server error', 'Something went wrong on our end. Please try again later'),
}
