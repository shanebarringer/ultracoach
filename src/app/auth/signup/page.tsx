'use client'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Select,
  SelectItem,
} from '@heroui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAtom } from 'jotai'
import { FlagIcon, LockIcon, MailIcon, MountainSnowIcon, UserIcon } from 'lucide-react'
import { z } from 'zod'

import React, { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import OnboardingFlow from '@/components/onboarding/OnboardingFlow'
import { useBetterAuth } from '@/hooks/useBetterAuth'
import { signUpFormAtom } from '@/lib/atoms'
import { createLogger } from '@/lib/logger'

const logger = createLogger('SignUp')

// Zod schema for signup form validation
const signUpSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
  role: z.enum(['runner', 'coach'], { message: 'Please select your role' }),
})

type SignUpForm = z.infer<typeof signUpSchema>

export default function SignUp() {
  const [formState, setFormState] = useAtom(signUpFormAtom)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const router = useRouter()
  const { signUp } = useBetterAuth()

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    setError,
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      role: 'runner',
    },
  })

  const onSubmit = async (data: SignUpForm) => {
    setFormState(prev => ({ ...prev, loading: true }))

    try {
      logger.info('Attempting sign up:', {
        email: data.email,
        fullName: data.fullName,
        role: data.role,
      })

      const result = await signUp(data.email, data.password, data.fullName, data.role)

      if (!result.success) {
        logger.error('Sign up failed:', result.error)
        // Sanitize error message for security
        const sanitizedError =
          result.error?.toLowerCase().includes('email') &&
          result.error?.toLowerCase().includes('exists')
            ? 'An account with this email already exists'
            : 'Registration failed. Please try again.'
        setError('email', { message: sanitizedError })
      } else {
        logger.info('Sign up successful:', { userRole: data.role })
        setFormState(prev => ({ ...prev, loading: false }))

        // In test environment, skip onboarding and redirect directly to dashboard
        if (
          process.env.NODE_ENV === 'test' ||
          (typeof window !== 'undefined' && window.location.port === '3001')
        ) {
          logger.info('Test environment detected, skipping onboarding and redirecting to dashboard')
          router.push('/dashboard')
        } else {
          // Show onboarding flow after successful signup in production
          setShowOnboarding(true)
        }
      }
    } catch (error) {
      logger.error('Sign up exception:', error)
      // Sanitize error message for security - don't use the actual error
      setError('email', { message: 'Registration failed. Please try again.' })
    } finally {
      setFormState(prev => ({ ...prev, loading: false }))
    }
  }

  const handleOnboardingComplete = () => {
    logger.info('Onboarding completed, redirecting to dashboard')
    // Redirect to dashboard which will handle role-based routing
    router.push('/dashboard')
  }

  const handleOnboardingClose = () => {
    // If user closes onboarding without completing, still redirect them
    logger.info('Onboarding closed, redirecting to dashboard')
    handleOnboardingComplete()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary/10 via-background to-secondary/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card className="border-t-4 border-t-secondary shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex flex-col items-center space-y-3">
              <MountainSnowIcon className="h-12 w-12 text-secondary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                  🏔️ UltraCoach
                </h1>
                <p className="text-lg text-foreground-600 mt-1">Join the Expedition</p>
              </div>
            </div>
          </CardHeader>
          <Divider />
          <CardBody className="pt-6">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-4">
                <Controller
                  name="fullName"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      id="fullName"
                      type="text"
                      label="Full Name"
                      required
                      placeholder="Enter your expedition name"
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
                  name="email"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      label="Email Address"
                      required
                      placeholder="Enter your base camp email"
                      isInvalid={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                      startContent={<MailIcon className="w-4 h-4 text-foreground-400" />}
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
                      required
                      placeholder="Create your summit key"
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

                <Controller
                  name="role"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Select
                      selectedKeys={field.value ? [field.value] : []}
                      onSelectionChange={keys => {
                        const selectedRole = Array.from(keys).join('') as 'runner' | 'coach'
                        field.onChange(selectedRole)
                      }}
                      label="Choose your path"
                      isInvalid={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                      startContent={<FlagIcon className="w-4 h-4 text-foreground-400" />}
                      variant="bordered"
                      size="lg"
                      classNames={{
                        label: 'text-foreground-600',
                        value: 'text-foreground',
                      }}
                    >
                      <SelectItem key="runner" startContent="🏃" textValue="Trail Runner">
                        <span className="font-medium">Trail Runner</span>
                        <span className="text-sm text-foreground-500 block">
                          Conquer your personal peaks
                        </span>
                      </SelectItem>
                      <SelectItem key="coach" startContent="🏔️" textValue="Mountain Guide">
                        <span className="font-medium">Mountain Guide</span>
                        <span className="text-sm text-foreground-500 block">
                          Lead others to their summit
                        </span>
                      </SelectItem>
                    </Select>
                  )}
                />
              </div>

              <Button
                type="submit"
                color="secondary"
                size="lg"
                className="w-full font-semibold"
                isLoading={isSubmitting || formState.loading}
                startContent={
                  !(isSubmitting || formState.loading) ? (
                    <MountainSnowIcon className="w-5 h-5" />
                  ) : null
                }
              >
                {isSubmitting || formState.loading
                  ? 'Preparing your expedition...'
                  : 'Start Your Journey'}
              </Button>
            </form>

            <Divider className="my-6" />

            <div className="text-center">
              <p className="text-sm text-foreground-600">
                Already have a base camp?{' '}
                <Link
                  href="/auth/signin"
                  className="font-semibold text-primary hover:text-primary-600 transition-colors"
                >
                  Return to expedition
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Onboarding Flow */}
      <OnboardingFlow
        isOpen={showOnboarding}
        onClose={handleOnboardingClose}
        onComplete={handleOnboardingComplete}
      />
    </div>
  )
}
