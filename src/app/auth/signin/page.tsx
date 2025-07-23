'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Input, Card, CardHeader, CardBody, Divider } from '@heroui/react'
import { MountainSnowIcon, UserIcon, LockIcon } from 'lucide-react'
import { authClient } from '@/lib/better-auth-client'
import { useAtom } from 'jotai'
import { sessionAtom, userAtom, signInFormAtom } from '@/lib/atoms'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import { createLogger } from '@/lib/logger'

const logger = createLogger('SignIn');

export default function SignIn() {
  const [signInForm, setSignInForm] = useAtom(signInFormAtom)
  const router = useRouter()
  const [, setSession] = useAtom(sessionAtom)
  const [, setUser] = useAtom(userAtom)

  const validate = () => {
    const newErrors = { email: '', password: '' }
    if (!signInForm.email) {
      newErrors.email = 'Email is required.'
    } else if (!/\S+@\S+\.\S+/.test(signInForm.email)) {
      newErrors.email = 'Email address is invalid.'
    }
    if (!signInForm.password) {
      newErrors.password = 'Password is required.'
    }
    setSignInForm(prev => ({ ...prev, errors: newErrors }))
    return !newErrors.email && !newErrors.password
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSignInForm(prev => ({ ...prev, loading: true }))
    
    try {
      const { data, error } = await authClient.signIn.email({
        email: signInForm.email,
        password: signInForm.password
      })

      if (error) {
        logger.error('SignIn error:', error)
        // Sanitize error message for security - don't expose internal details
        const sanitizedMessage = error.message?.toLowerCase().includes('invalid') || 
                                 error.message?.toLowerCase().includes('incorrect') ||
                                 error.message?.toLowerCase().includes('not found')
                                 ? 'Invalid email or password' 
                                 : 'Invalid credentials'
        setSignInForm(prev => ({ 
          ...prev, 
          errors: { 
            ...prev.errors, 
            email: sanitizedMessage
          }
        }))
        return
      }

      if (data) {
        // Update Jotai atoms
        setSession(data)
        setUser(data.user)
        
        // Fetch user role from database
        try {
          const roleResponse = await fetch(`/api/user/role?userId=${data.user.id}`)
          const roleData = await roleResponse.json()
          const userRole = roleData.role || 'runner'
          
          // Update user object with role
          setUser({ ...data.user, role: userRole })
          
          // Redirect based on user role
          if (userRole === 'coach') {
            router.push('/dashboard/coach')
          } else {
            router.push('/dashboard/runner')
          }
        } catch (error) {
          logger.error('Error fetching user role:', error)
          
          // Notify user of the issue but allow them to proceed
          setSignInForm(prev => ({ 
            ...prev, 
            errors: { 
              ...prev.errors, 
              email: 'Warning: Unable to verify your role. You will be logged in as a runner.' 
            }
          }))
          
          // Default to runner role and proceed
          setUser({ ...data.user, role: 'runner' })
          
          // Add a small delay to let user see the warning
          setTimeout(() => {
            router.push('/dashboard/runner')
          }, 2000)
        }
      }
    } catch (error) {
      logger.error('SignIn exception:', error)
      // Sanitize error message for security
      setSignInForm(prev => ({ 
        ...prev, 
        errors: { 
          ...prev.errors, 
          email: 'Login failed. Please try again.' 
        }
      }))
    } finally {
      setSignInForm(prev => ({ ...prev, loading: false }))
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
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  label="Email address"
                  autoComplete="email"
                  required
                  placeholder="Enter your expedition email"
                  value={signInForm.email}
                  onChange={(e) => setSignInForm(prev => ({ ...prev, email: e.target.value }))}
                  isInvalid={!!signInForm.errors.email}
                  errorMessage={signInForm.errors.email}
                  startContent={<UserIcon className="w-4 h-4 text-foreground-400" />}
                  variant="bordered"
                  size="lg"
                  classNames={{
                    input: "text-foreground",
                    label: "text-foreground-600"
                  }}
                />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  label="Password"
                  autoComplete="current-password"
                  required
                  placeholder="Enter your summit key"
                  value={signInForm.password}
                  onChange={(e) => setSignInForm(prev => ({ ...prev, password: e.target.value }))}
                  isInvalid={!!signInForm.errors.password}
                  errorMessage={signInForm.errors.password}
                  startContent={<LockIcon className="w-4 h-4 text-foreground-400" />}
                  variant="bordered"
                  size="lg"
                  classNames={{
                    input: "text-foreground",
                    label: "text-foreground-600"
                  }}
                />
              </div>

              <Button
                type="submit"
                color="primary"
                size="lg"
                as="button"
                disableRipple
                className="w-full font-semibold"
                isLoading={signInForm.loading}
                startContent={!signInForm.loading ? <MountainSnowIcon className="w-5 h-5" /> : null}
              >
                {signInForm.loading ? 'Ascending to Base Camp...' : 'Begin Your Expedition'}
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