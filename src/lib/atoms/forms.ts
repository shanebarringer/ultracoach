// Form state management atoms
import { atom } from 'jotai'

// Generic form state
export const formErrorsAtom = atom<Record<string, string>>({})
export const formSubmittingAtom = atom(false)
export const formSuccessAtom = atom(false)

// Specific form atoms
export const signInFormAtom = atom({
  email: '',
  password: '',
  rememberMe: false,
  loading: false,
})

export const signUpFormAtom = atom({
  email: '',
  password: '',
  confirmPassword: '',
  name: '',
  userType: 'runner' as 'runner' | 'coach',
  loading: false,
})

export const profileFormAtom = atom({
  name: '',
  email: '',
  bio: '',
  avatarUrl: '',
  preferences: {},
})

// Form validation state
export const formValidationAtom = atom({
  isValid: false,
  errors: [] as string[],
  touched: {} as Record<string, boolean>,
})

// Create training plan form
export const createTrainingPlanFormAtom = atom({
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  race_id: null as string | null,
  phases: [] as string[],
  difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
  template_id: null as string | null,
  error: null as string | null,
  loading: false,
})

// Workout log form
export const workoutLogFormAtom = atom({
  workout_id: null as string | null,
  date: '',
  actual_type: '',
  actual_distance: null as number | null,
  actual_duration: null as number | null,
  actual_intensity: null as number | null,
  actual_elevation_gain: null as number | null,
  actual_heart_rate_avg: null as number | null,
  actual_heart_rate_max: null as number | null,
  actual_pace: null as string | null,
  weather_conditions: null as string | null,
  terrain_type: null as string | null,
  workout_notes: '',
  completed_at: null as string | null,
  strava_activity_id: null as string | null,
  error: null as string | null,
  loading: false,
})

// Auth success/redirect states
export const authSuccessMessageAtom = atom<string | null>(null)
export const authRedirectingAtom = atom(false)

// Jotai Devtools debug labels
formErrorsAtom.debugLabel = 'forms/errors'
formSubmittingAtom.debugLabel = 'forms/submitting'
formSuccessAtom.debugLabel = 'forms/success'
signInFormAtom.debugLabel = 'forms/signIn'
signUpFormAtom.debugLabel = 'forms/signUp'
profileFormAtom.debugLabel = 'forms/profile'
formValidationAtom.debugLabel = 'forms/validation'
createTrainingPlanFormAtom.debugLabel = 'forms/createTrainingPlan'
workoutLogFormAtom.debugLabel = 'forms/workoutLog'
authSuccessMessageAtom.debugLabel = 'forms/authSuccessMessage'
authRedirectingAtom.debugLabel = 'forms/authRedirecting'
