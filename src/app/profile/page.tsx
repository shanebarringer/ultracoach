'use client'

import { Button, Card, CardBody, CardHeader, Divider, Input } from '@heroui/react'
import { MailIcon, MountainSnowIcon, UserIcon } from 'lucide-react'

import { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import Layout from '@/components/layout/Layout'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import { useSession } from '@/hooks/useBetterSession'
import { createLogger } from '@/lib/logger'
import { commonToasts } from '@/lib/toast'

const logger = createLogger('Profile')

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  })

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Initialize form data with session data
    setFormData({
      name: session.user?.name || '',
      email: session.user?.email || '',
    })
  }, [status, session, router])

  const handleSave = async () => {
    try {
      logger.info('Saving profile changes:', formData)

      // TODO: Implement profile update API call
      // const response = await fetch('/api/user/profile', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // })

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      setIsEditing(false)

      // Show success toast
      commonToasts.profileSaved()

      logger.info('Profile updated successfully')
    } catch (error) {
      logger.error('Failed to update profile:', error)
      commonToasts.profileError(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      name: session?.user?.name || '',
      email: session?.user?.email || '',
    })
    setIsEditing(false)
  }

  if (status === 'loading') {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-content2 rounded-lg w-64 mb-8"></div>
            <div className="h-64 bg-content2 rounded-lg"></div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!session) {
    return null
  }

  return (
    <Layout>
      <ModernErrorBoundary>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <MountainSnowIcon className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Profile Settings
              </h1>
            </div>
            <p className="text-foreground-600 text-lg">
              Manage your account information and preferences
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Information */}
            <div className="lg:col-span-2">
              <Card className="border border-divider">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold text-foreground">Account Information</h2>
                  </div>
                </CardHeader>
                <Divider />
                <CardBody className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Full Name"
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      startContent={<UserIcon className="w-4 h-4 text-foreground-400" />}
                      variant="bordered"
                      isReadOnly={!isEditing}
                      className={isEditing ? '' : 'opacity-75'}
                    />
                    <Input
                      label="Email Address"
                      value={formData.email}
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      startContent={<MailIcon className="w-4 h-4 text-foreground-400" />}
                      variant="bordered"
                      isReadOnly={!isEditing}
                      className={isEditing ? '' : 'opacity-75'}
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    {!isEditing ? (
                      <Button color="primary" variant="flat" onPress={() => setIsEditing(true)}>
                        Edit Profile
                      </Button>
                    ) : (
                      <>
                        <Button variant="light" onPress={handleCancel}>
                          Cancel
                        </Button>
                        <Button color="primary" onPress={handleSave}>
                          Save Changes
                        </Button>
                      </>
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Account Summary */}
            <div className="space-y-6">
              <Card className="border border-divider">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-foreground">Account Summary</h3>
                </CardHeader>
                <Divider />
                <CardBody className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-600">Account Type:</span>
                    <span className="font-medium capitalize">{session.user.role || 'Runner'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-600">Member Since:</span>
                    <span className="font-medium">{new Date().toLocaleDateString()}</span>
                  </div>
                </CardBody>
              </Card>

              <Card className="border border-divider">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
                </CardHeader>
                <Divider />
                <CardBody className="space-y-3">
                  <Button
                    variant="light"
                    className="justify-start"
                    onPress={() => router.push('/auth/reset-password')}
                  >
                    Change Password
                  </Button>
                  <Button
                    variant="light"
                    className="justify-start"
                    onPress={() =>
                      router.push(
                        session.user.role === 'coach' ? '/dashboard/coach' : '/dashboard/runner'
                      )
                    }
                  >
                    Back to Dashboard
                  </Button>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </ModernErrorBoundary>
    </Layout>
  )
}
