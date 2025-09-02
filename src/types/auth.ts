// Authentication Types

export interface User {
  id: string
  email: string
  name?: string
  fullName?: string
  userType?: 'coach' | 'runner'
  role?: string
  image?: string
  createdAt?: string
  updatedAt?: string
}

export interface Session {
  user: User
  expiresAt?: string
  sessionToken?: string
}

export interface AuthError {
  code: string
  message: string
  field?: string
}

export interface SignUpData {
  email: string
  password: string
  name: string
  userType?: 'coach' | 'runner'
  callbackURL?: string
}

export interface SignInData {
  email: string
  password: string
  rememberMe?: boolean
  callbackURL?: string
}

export interface ResetPasswordData {
  token: string
  password: string
  confirmPassword: string
}

export interface ForgotPasswordData {
  email: string
}

export interface AuthResponse {
  user?: User
  session?: Session
  error?: AuthError
  success: boolean
  redirectTo?: string
}
