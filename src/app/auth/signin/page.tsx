'use client'

import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Input, Card, CardHeader, CardBody, Divider } from '@heroui/react'
import { MountainSnowIcon, UserIcon, LockIcon } from 'lucide-react'
import { authClient } from '@/lib/better-auth-client'
import { useAtom } from 'jotai'
import { sessionAtom, userAtom, signInFormAtom } from '@/lib/atoms'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import { createLogger } from '@/lib/logger'

const logger = createLogger('SignIn')

// Zod schema for signin form validation
const signInSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
})

type SignInForm = z.infer<typeof signInSchema>

export default function SignIn() {
  const [formState, setFormState] = useAtom(signInFormAtom)
  const router = useRouter()
  const [, setSession] = useAtom(sessionAtom)
  const [, setUser] = useAtom(userAtom)

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    setError
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    }
  })

  const onSubmit = async (data: SignInForm) => {
    setFormState(prev => ({ ...prev, loading: true }))
    
    try {
      logger.info('Attempting sign in:', { email: data.email })
      
      const { data: authData, error } = await authClient.signIn.email({
        email: data.email,
        password: data.password
      })

      if (error) {
        logger.error('SignIn error:', error)
        // Sanitize error message for security - don't expose internal details
        const sanitizedMessage = error.message?.toLowerCase().includes('invalid') || 
                                 error.message?.toLowerCase().includes('incorrect') ||
                                 error.message?.toLowerCase().includes('not found')
                                 ? 'Invalid email or password' 
                                 : 'Invalid credentials'
        setError('email', { message: sanitizedMessage })
        return
      }

      if (authData) {
        // Update Jotai atoms
        setSession(authData)
        setUser(authData.user)
        
        logger.info('Sign in successful, fetching user role')
        
        // Fetch user role from database
        try {
          const roleResponse = await fetch(`/api/user/role?userId=${authData.user.id}`)
          const roleData = await roleResponse.json()
          const userRole = roleData.role || 'runner'
          
          logger.info('User role fetched:', { userRole })
          
          // Update user object with role
          setUser({ ...authData.user, role: userRole })
          
          // Redirect based on user role
          if (userRole === 'coach') {
            router.push('/dashboard/coach')
          } else {
            router.push('/dashboard/runner')
          }
        } catch (error) {
          logger.error('Error fetching user role:', error)
          
          // Notify user of the issue but allow them to proceed
          setError('email', { 
            message: 'Warning: Unable to verify your role. You will be logged in as a runner.' 
          })
          
          // Default to runner role and proceed
          setUser({ ...authData.user, role: 'runner' })
          
          // Add a small delay to let user see the warning
          setTimeout(() => {
            router.push('/dashboard/runner')
          }, 2000)
        }
      }
    } catch (error) {
      logger.error('SignIn exception:', error)
      // Sanitize error message for security
      setError('email', { message: 'Login failed. Please try again.' })
    } finally {
      setFormState(prev => ({ ...prev, loading: false }))
    }
  }

  return (
    <ModernErrorBoundary>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
        <Card className="border-t-4 border-t-primary shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex flex-col items-center space-y-3">
              <MountainSnowIcon className="h-12 w-12 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  🏔️ UltraCoach
                </h1>
                <p className="text-lg text-foreground-600 mt-1">Base Camp Access</p>
              </div>
            </div>
          </CardHeader>
          <Divider />
          <CardBody className="pt-6">
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
                        input: "text-foreground",
                        label: "text-foreground-600"
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
                        input: "text-foreground",
                        label: "text-foreground-600"
                      }}
                    />
                  )}
                />
              </div>

              <Button
                type="submit"
                color="primary"
                size="lg"
                as="button"
                disableRipple
                className="w-full font-semibold"
                isLoading={isSubmitting || formState.loading}
                startContent={!(isSubmitting || formState.loading) ? <MountainSnowIcon className="w-5 h-5" /> : null}
              >
                {(isSubmitting || formState.loading) ? 'Ascending to Base Camp...' : 'Begin Your Expedition'}
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