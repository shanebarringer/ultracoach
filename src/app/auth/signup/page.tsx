'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Input, Select, SelectItem, Card, CardHeader, CardBody, Divider } from '@heroui/react'
import { MountainSnowIcon, UserIcon, LockIcon, MailIcon, FlagIcon } from 'lucide-react'
import { useBetterAuth } from '@/hooks/useBetterAuth'

export default function SignUp() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'runner' as 'runner' | 'coach'
  })
  const [errors, setErrors] = useState({ email: '', password: '', fullName: '' })
  const router = useRouter()
  const { signUp, loading, error } = useBetterAuth()

  const validate = () => {
    const newErrors = { email: '', password: '', fullName: '' }
    if (!formData.fullName) {
      newErrors.fullName = 'Full name is required.'
    }
    if (!formData.email) {
      newErrors.email = 'Email is required.'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email address is invalid.'
    }
    if (!formData.password) {
      newErrors.password = 'Password is required.'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.'
    }
    setErrors(newErrors)
    return !newErrors.email && !newErrors.password && !newErrors.fullName
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const result = await signUp(formData.email, formData.password, formData.fullName, formData.role)

    if (!result.success) {
      setErrors({ ...errors, email: result.error || 'An error occurred' })
    } else {
      // Redirect based on user role
      if (result.data?.user?.role === 'coach') {
        router.push('/dashboard/coach')
      } else {
        router.push('/dashboard/runner')
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card className="border-t-4 border-t-secondary shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex flex-col items-center space-y-3">
              <MountainSnowIcon className="h-12 w-12 text-secondary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  🏔️ UltraCoach
                </h1>
                <p className="text-lg text-foreground-600 mt-1">Join the Expedition</p>
              </div>
            </div>
          </CardHeader>
          <Divider />
          <CardBody className="pt-6">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  label="Full Name"
                  required
                  placeholder="Enter your expedition name"
                  value={formData.fullName}
                  onChange={handleChange}
                  isInvalid={!!errors.fullName}
                  errorMessage={errors.fullName}
                  startContent={<UserIcon className="w-4 h-4 text-foreground-400" />}
                  variant="bordered"
                  size="lg"
                  classNames={{
                    input: "text-foreground",
                    label: "text-foreground-600"
                  }}
                />
                
                <Input
                  id="email"
                  name="email"
                  type="email"
                  label="Email Address"
                  required
                  placeholder="Enter your base camp email"
                  value={formData.email}
                  onChange={handleChange}
                  isInvalid={!!errors.email}
                  errorMessage={errors.email}
                  startContent={<MailIcon className="w-4 h-4 text-foreground-400" />}
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
                  required
                  placeholder="Create your summit key"
                  value={formData.password}
                  onChange={handleChange}
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
                
                <Select
                  id="role"
                  name="role"
                  label="Choose your path"
                  selectedKeys={[formData.role]}
                  onSelectionChange={(keys) => {
                    const selectedRole = Array.from(keys).join('') as 'runner' | 'coach'
                    setFormData(prev => ({ ...prev, role: selectedRole }))
                  }}
                  startContent={<FlagIcon className="w-4 h-4 text-foreground-400" />}
                  variant="bordered"
                  size="lg"
                  classNames={{
                    label: "text-foreground-600",
                    value: "text-foreground"
                  }}
                >
                  <SelectItem key="runner" startContent="🏃">
                    <span className="font-medium">Trail Runner</span>
                    <span className="text-sm text-foreground-500 block">Conquer your personal peaks</span>
                  </SelectItem>
                  <SelectItem key="coach" startContent="🏔️">
                    <span className="font-medium">Mountain Guide</span>
                    <span className="text-sm text-foreground-500 block">Lead others to their summit</span>
                  </SelectItem>
                </Select>
              </div>

              <Button
                type="submit"
                color="secondary"
                size="lg"
                className="w-full font-semibold"
                isLoading={loading}
                startContent={!loading ? <MountainSnowIcon className="w-5 h-5" /> : null}
              >
                {loading ? 'Preparing your expedition...' : 'Start Your Journey'}
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
    </div>
  )
}