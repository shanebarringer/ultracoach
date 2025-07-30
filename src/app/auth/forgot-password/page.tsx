'use client'

import { Button, Input } from '@heroui/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { authClient } from '@/lib/better-auth-client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('forgot-password')

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordData>()

  const onSubmit = async (data: ForgotPasswordData) => {
    setIsLoading(true)
    logger.info('Password reset requested for:', { email: data.email })

    try {
      const { error } = await authClient.forgetPassword({
        email: data.email,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        logger.error('Password reset request failed:', error)
        setError('email', {
          message: 'Failed to send reset email. Please try again.',
        })
      } else {
        logger.info('Password reset email sent successfully')
        setIsSubmitted(true)
      }
    } catch (error) {
      logger.error('Password reset exception:', error)
      setError('email', {
        message: 'An unexpected error occurred. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Check Your Email
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              We've sent a password reset link to your email address. Please check your inbox and
              follow the instructions to reset your password.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Didn't receive the email? Check your spam folder or try again in a few minutes.
            </p>
            <Button
              as="a"
              href="/auth/signin"
              variant="light"
              className="w-full"
            >
              Back to Sign In
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Reset Your Password
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            {...register('email')}
            type="email"
            label="Email Address"
            placeholder="Enter your email"
            isInvalid={!!errors.email}
            errorMessage={errors.email?.message}
            isRequired
            autoComplete="email"
            className="w-full"
          />

          <Button
            type="submit"
            color="primary"
            className="w-full"
            isLoading={isLoading}
            isDisabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>

          <div className="text-center">
            <Button
              as="a"
              href="/auth/signin"
              variant="light"
              size="sm"
            >
              Back to Sign In
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}