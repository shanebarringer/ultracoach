'use client'

import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { Button, Input } from '@heroui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Suspense, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { useRouter, useSearchParams } from 'next/navigation'

import { authClient } from '@/lib/better-auth-client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('reset-password')

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters' })
      .max(128, { message: 'Password must be less than 128 characters' }),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetPasswordData = z.infer<typeof resetPasswordSchema>

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isVisible, setIsVisible] = useState(false)
  const [isConfirmVisible, setIsConfirmVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setTokenError('Invalid or missing reset token. Please request a new password reset.')
    }
  }, [token])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordData) => {
    if (!token) {
      setError('password', { message: 'Invalid reset token' })
      return
    }

    setIsLoading(true)
    logger.info('Password reset attempted')

    try {
      const { error } = await authClient.resetPassword({
        token,
        newPassword: data.password,
      })

      if (error) {
        logger.error('Password reset failed:', error)

        // Handle specific error cases
        if (error.message?.includes('token')) {
          setTokenError('This reset link has expired or is invalid. Please request a new one.')
        } else {
          setError('password', {
            message: 'Failed to reset password. Please try again.',
          })
        }
      } else {
        logger.info('Password reset successful')

        // Redirect to signin with success message
        router.push('/auth/signin?message=password-reset-success')
      }
    } catch (error) {
      logger.error('Password reset exception:', error)
      setError('password', {
        message: 'An unexpected error occurred. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Invalid Reset Link
            </h1>
            <p className="text-slate-600 dark:text-slate-300">{tokenError}</p>
            <div className="space-y-2">
              <Button as="a" href="/auth/forgot-password" color="primary" className="w-full">
                Request New Reset Link
              </Button>
              <Button as="a" href="/auth/signin" variant="light" className="w-full">
                Back to Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Set New Password</h1>
          <p className="text-slate-600 dark:text-slate-300">Enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            {...register('password')}
            type={isVisible ? 'text' : 'password'}
            label="New Password"
            placeholder="Enter your new password"
            isInvalid={!!errors.password}
            errorMessage={errors.password?.message}
            isRequired
            autoComplete="new-password"
            endContent={
              <button
                className="focus:outline-hidden"
                type="button"
                onClick={() => setIsVisible(!isVisible)}
              >
                {isVisible ? (
                  <EyeSlashIcon className="text-2xl text-default-400 pointer-events-none w-5 h-5" />
                ) : (
                  <EyeIcon className="text-2xl text-default-400 pointer-events-none w-5 h-5" />
                )}
              </button>
            }
          />

          <Input
            {...register('confirmPassword')}
            type={isConfirmVisible ? 'text' : 'password'}
            label="Confirm New Password"
            placeholder="Confirm your new password"
            isInvalid={!!errors.confirmPassword}
            errorMessage={errors.confirmPassword?.message}
            isRequired
            autoComplete="new-password"
            endContent={
              <button
                className="focus:outline-hidden"
                type="button"
                onClick={() => setIsConfirmVisible(!isConfirmVisible)}
              >
                {isConfirmVisible ? (
                  <EyeSlashIcon className="text-2xl text-default-400 pointer-events-none w-5 h-5" />
                ) : (
                  <EyeIcon className="text-2xl text-default-400 pointer-events-none w-5 h-5" />
                )}
              </button>
            }
          />

          <Button
            type="submit"
            color="primary"
            className="w-full"
            isLoading={isLoading}
            isDisabled={isLoading}
          >
            {isLoading ? 'Updating Password...' : 'Update Password'}
          </Button>

          <div className="text-center">
            <Button as="a" href="/auth/signin" variant="light" size="sm">
              Back to Sign In
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
