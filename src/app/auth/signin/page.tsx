'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Input, Card, CardHeader, CardBody, Divider } from '@heroui/react'
import { MountainSnowIcon, UserIcon, LockIcon } from 'lucide-react'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const validate = () => {
    const newErrors = { email: '', password: '' }
    if (!email) {
      newErrors.email = 'Email is required.'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email address is invalid.'
    }
    if (!password) {
      newErrors.password = 'Password is required.'
    }
    setErrors(newErrors)
    return !newErrors.email && !newErrors.password
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        setErrors({ ...errors, email: 'Invalid credentials' })
      } else {
        const session = await getSession()
        if (session?.user.role === 'coach') {
          router.push('/dashboard/coach')
        } else {
          router.push('/dashboard/runner')
        }
      }
    } catch {
      setErrors({ ...errors, email: 'An error occurred. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  isInvalid={!!errors.email}
                  errorMessage={errors.email}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  isInvalid={!!errors.password}
                  errorMessage={errors.password}
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
                className="w-full font-semibold"
                isLoading={loading}
                startContent={!loading ? <MountainSnowIcon className="w-5 h-5" /> : null}
              >
                {loading ? 'Ascending to Base Camp...' : 'Begin Your Expedition'}
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
  )
}