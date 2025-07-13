'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { Button, Input, Select, SelectItem } from '@heroui/react'

export default function SignUp() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'runner' as 'runner' | 'coach'
  })
  const [errors, setErrors] = useState({ email: '', password: '', fullName: '' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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

    setLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        router.push('/auth/signin?message=Account created successfully')
      } else {
        const data = await response.json()
        setErrors({ ...errors, email: data.error || 'An error occurred' })
      }
    } catch {
      setErrors({ ...errors, email: 'An error occurred. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your UltraCoach account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
              sign in to your existing account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              id="fullName"
              name="fullName"
              type="text"
              label="Full Name"
              required
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleChange}
              isInvalid={!!errors.fullName}
              errorMessage={errors.fullName}
            />
            
            <Input
              id="email"
              name="email"
              type="email"
              label="Email Address"
              required
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              isInvalid={!!errors.email}
              errorMessage={errors.email}
            />
            
            <Input
              id="password"
              name="password"
              type="password"
              label="Password"
              required
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              isInvalid={!!errors.password}
              errorMessage={errors.password}
            />
            
            <Select
              id="role"
              name="role"
              label="I am a..."
              selectedKeys={[formData.role]}
              onSelectionChange={(keys) => {
                const selectedRole = Array.from(keys).join('') as 'runner' | 'coach'
                setFormData(prev => ({ ...prev, role: selectedRole }))
              }}
            >
              <SelectItem key="runner">Runner</SelectItem>
              <SelectItem key="coach">Coach</SelectItem>
            </Select>
          </div>

          <div>
            <Button
              type="submit"
              color="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}