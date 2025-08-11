import { useAtom } from 'jotai'

import { useEffect } from 'react'

import { authStateAtom } from '@/lib/atoms'
import { authClient } from '@/lib/better-auth-client'
import type { Session, User } from '@/lib/better-auth-client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useBetterAuth')

export function useBetterAuth() {
  const [authState, setAuthState] = useAtom(authStateAtom)

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: session, error } = await authClient.getSession()

        if (error) {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            error: error.message || null,
          })
          return
        }

        setAuthState({
          user: session?.user as User | null,
          session: session as Session | null,
          loading: false,
          error: null,
        })
      } catch (error) {
        setAuthState({
          user: null,
          session: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    getSession()
  }, [setAuthState])

  const signIn = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      const { data, error } = await authClient.signIn.email({
        email,
        password,
      })

      if (error) {
        setAuthState(prev => ({
          ...prev,
          user: null,
          session: null,
          loading: false,
          error: error.message || null,
        }))
        return { success: false, error: error.message }
      }

      // For sign in, get the session after authentication
      const sessionResult = await authClient.getSession()
      setAuthState({
        user: data.user as User,
        session: sessionResult.data as Session | null,
        loading: false,
        error: null,
      })

      return { success: true, data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed'
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
      return { success: false, error: errorMessage }
    }
  }

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role?: 'runner' | 'coach'
  ) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      // Sign up the user with role included in initial request
      const signUpPayload = {
        email,
        password,
        name,
        role: role || 'runner', // Pass role during signup
        fullName: name, // Also set fullName
      }

      logger.info('Sending signup request to Better Auth:', {
        email: signUpPayload.email,
        name: signUpPayload.name,
        role: signUpPayload.role,
        fullName: signUpPayload.fullName,
        payloadKeys: Object.keys(signUpPayload),
      })

      const { data, error } = await authClient.signUp.email(signUpPayload)

      if (error) {
        setAuthState(prev => ({
          ...prev,
          user: null,
          session: null,
          loading: false,
          error: error.message || null,
        }))
        return { success: false, error: error.message }
      }

      // Get the session after authentication to get updated user data
      const sessionResult = await authClient.getSession()
      setAuthState({
        user: data.user as User,
        session: sessionResult.data as Session | null,
        loading: false,
        error: null,
      })

      return { success: true, data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed'
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
      return { success: false, error: errorMessage }
    }
  }

  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      const { error } = await authClient.signOut()

      if (error) {
        setAuthState(prev => ({
          ...prev,
          user: null,
          session: null,
          loading: false,
          error: error.message || null,
        }))
        return { success: false, error: error.message }
      }

      setAuthState({
        user: null,
        session: null,
        loading: false,
        error: null,
      })

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed'
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
      return { success: false, error: errorMessage }
    }
  }

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
  }
}

export default useBetterAuth
