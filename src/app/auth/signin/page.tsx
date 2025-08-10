'use client'

import { Button, Card, CardBody, CardHeader, Divider, Input } from '@heroui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAtom } from 'jotai'
import { LockIcon, MountainSnowIcon, UserIcon } from 'lucide-react'
import { z } from 'zod'

import React from 'react'
import { Controller, useForm } from 'react-hook-form'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import { sessionAtom, signInFormAtom, userAtom } from '@/lib/atoms'
import type { User } from '@/lib/better-auth'
import { authClient } from '@/lib/better-auth-client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('SignIn')

// Zod schema for signin form validation
const signInSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
})

type SignInForm = z.infer<typeof signInSchema>

export default function SignIn() {
  const [formState, setFormState] = useAtom(signInFormAtom)
  const router = useRouter()
  const [, setSession] = useAtom(sessionAtom)
  const [, setUser] = useAtom(userAtom)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = React.useState(false)

  // Check for success messages from URL params
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const message = urlParams.get('message')

    if (message === 'password-reset-success') {
      setSuccessMessage(
        'Your password has been reset successfully. Please sign in with your new password.'
      )
      // Clean URL
      router.replace('/auth/signin', { scroll: false })
    }
  }, [router]) // Include router dependency as required by ESLint

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    setError,
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: SignInForm) => {
    setFormState(prev => ({ ...prev, loading: true }))

    try {
      logger.info('Attempting sign in:', { email: data.email })

      const { data: authData, error } = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      })

      if (error) {
        logger.error('SignIn error:', error)
        // Sanitize error message for security - don't expose internal details
        const sanitizedMessage =
          error.message?.toLowerCase().includes('invalid') ||
          error.message?.toLowerCase().includes('incorrect') ||
          error.message?.toLowerCase().includes('not found')
            ? 'Invalid email or password'
            : 'Invalid credentials'
        setError('email', { message: sanitizedMessage })
        return
      }

      if (authData) {
        logger.info('Sign in successful, fetching complete session data')

        // Add delay to ensure database consistency
        await new Promise(resolve => setTimeout(resolve, 100))

        // Get the complete session data which includes the role
        const sessionData = await authClient.getSession()

        if (sessionData?.data) {
          // Update Jotai atoms with complete session data
          setSession(sessionData.data)
          setUser(sessionData.data.user)

          // Enhanced role extraction with fallback API call
          let userRole = (sessionData.data.user as User).role || 'runner'

          // If role is missing or undefined, fetch from API as fallback
          if (!userRole || userRole === 'runner') {
            try {
              logger.info('Role unclear from session, fetching from API:', {
                sessionRole: userRole,
                userId: sessionData.data.user.id,
              })

              const roleResponse = await fetch(`/api/user/role?userId=${sessionData.data.user.id}`)
              if (roleResponse.ok) {
                const roleData = await roleResponse.json()
                userRole = roleData.role || 'runner'
                logger.info('Role fetched from API:', { apiRole: userRole })
              }
            } catch (roleError) {
              logger.error('Failed to fetch role from API:', roleError)
              // Continue with default role
            }
          }

          logger.info('Final user role determined:', {
            userRole,
            userId: sessionData.data.user.id,
            sessionUser: sessionData.data.user,
            fullSessionData: sessionData.data,
          })

          // Set redirecting state for smooth transition
          setIsRedirecting(true)

          // Redirect to dashboard which will handle role-based routing
          logger.info('✅ Redirecting authenticated user to dashboard', {
            userRole,
            userId: sessionData.data.user.id,
          })
          router.push('/dashboard')
        } else {
          logger.error('Failed to get session data after sign in')
          setIsRedirecting(false)
          setError('email', { message: 'Login failed. Please try again.' })
        }
      } else {
        logger.info('No authData received')
        setIsRedirecting(false)
        setError('email', { message: 'Login failed. Please try again.' })
      }
    } catch (error) {
      logger.error('SignIn exception:', error)
      // Sanitize error message for security
      setIsRedirecting(false)
      setError('email', { message: 'Login failed. Please try again.' })
    } finally {
      setFormState(prev => ({ ...prev, loading: false }))
    }
  }

  // Show redirecting state instead of login form during transition
  if (isRedirecting) {
    return (
      <ModernErrorBoundary>
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary/10 via-background to-secondary/10 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <Card className="border-t-4 border-t-primary shadow-2xl">
              <CardBody className="text-center py-12">
                <div className="flex flex-col items-center space-y-4">
                  <MountainSnowIcon className="h-12 w-12 text-primary animate-pulse" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Welcome to Base Camp!</h2>
                    <p className="text-foreground-600 mt-2">
                      Taking you to your expedition dashboard...
                    </p>
                  </div>
                  <div className="flex space-x-1 mt-4">
                    <div
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    ></div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </ModernErrorBoundary>
    )
  }

  return (
    <ModernErrorBoundary>
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary/10 via-background to-secondary/10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card className="border-t-4 border-t-primary shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="flex flex-col items-center space-y-3">
                <MountainSnowIcon className="h-12 w-12 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold text-foreground bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                    🏔️ UltraCoach
                  </h1>
                  <p className="text-lg text-foreground-600 mt-1">Base Camp Access</p>
                </div>
              </div>
            </CardHeader>
            <Divider />
            <CardBody className="pt-6">
              {successMessage && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400">{successMessage}</p>
                </div>
              )}
              <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-4">
                  <Controller
                    name="email"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        label="Email address"
                        autoComplete="email"
                        required
                        placeholder="Enter your expedition email"
                        isInvalid={!!fieldState.error}
                        errorMessage={fieldState.error?.message}
                        startContent={<UserIcon className="w-4 h-4 text-foreground-400" />}
                        variant="bordered"
                        size="lg"
                        classNames={{
                          input: 'text-foreground',
                          label: 'text-foreground-600',
                        }}
                      />
                    )}
                  />
                  <Controller
                    name="password"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input
                        {...field}
                        id="password"
                        type="password"
                        label="Password"
                        autoComplete="current-password"
                        required
                        placeholder="Enter your summit key"
                        isInvalid={!!fieldState.error}
                        errorMessage={fieldState.error?.message}
                        startContent={<LockIcon className="w-4 h-4 text-foreground-400" />}
                        variant="bordered"
                        size="lg"
                        classNames={{
                          input: 'text-foreground',
                          label: 'text-foreground-600',
                        }}
                      />
                    )}
                  />
                </div>

                <div className="flex justify-end">
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-primary hover:text-primary-600 transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  color="primary"
                  size="lg"
                  as="button"
                  disableRipple
                  className="w-full font-semibold"
                  isLoading={isSubmitting || formState.loading}
                  startContent={
                    !(isSubmitting || formState.loading) ? (
                      <MountainSnowIcon className="w-5 h-5" />
                    ) : null
                  }
                >
                  {isSubmitting || formState.loading
                    ? 'Ascending to Base Camp...'
                    : 'Begin Your Expedition'}
                </Button>
              </form>

              <Divider className="my-6" />

              <div className="text-center">
                <p className="text-sm text-foreground-600">
                  New to the mountains?{' '}
                  <Link
                    href="/auth/signup"
                    className="font-semibold text-primary hover:text-primary-600 transition-colors"
                  >
                    Join the expedition
                  </Link>
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </ModernErrorBoundary>
  )
}
