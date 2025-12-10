'use client'

import { Button, Card, CardBody, CardHeader, Chip, Divider, Input } from '@heroui/react'
import { MailIcon, UserIcon, Users } from 'lucide-react'

import { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import Layout from '@/components/layout/Layout'
import ModernErrorBoundary from '@/components/layout/ModernErrorBoundary'
import AboutMeSection from '@/components/profile/AboutMeSection'
import AvatarUpload from '@/components/profile/AvatarUpload'
import CertificationsSection from '@/components/profile/CertificationsSection'
import SocialProfiles from '@/components/profile/SocialProfiles'
// import UltraSignupResults from '@/components/profile/UltraSignupResults'
import WorkWithMeCard from '@/components/profile/WorkWithMeCard'
import { createLogger } from '@/lib/logger'
import { commonToasts } from '@/lib/toast'
import { formatMonthYear } from '@/lib/utils/date'
import type { Certification, ProfileData, SocialProfile } from '@/types/profile'

const logger = createLogger('Profile')

interface ProfilePageClientProps {
  user: {
    id: string
    email: string
    name: string | null
    role: 'coach' | 'runner'
    userType: 'coach' | 'runner'
    createdAt: string | Date
  }
}

export default function ProfilePageClient({ user }: ProfilePageClientProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
  })

  const isCoach = user.userType === 'coach'

  // Load profile data
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const response = await fetch('/api/profile', {
          credentials: 'same-origin',
        })
        if (response.ok) {
          const data = await response.json()
          setProfileData(data)
        }
      } catch (error) {
        logger.error('Failed to load profile data:', error)
        commonToasts.profileError('Failed to load profile data')
      } finally {
        setIsLoading(false)
      }
    }

    loadProfileData()
  }, [])

  const handleSave = async () => {
    try {
      logger.info('Saving profile changes:', formData)

      // TODO: Implement basic user info update API call
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
      name: user.name || '',
      email: user.email || '',
    })
    setIsEditing(false)
  }

  const handleAvatarChange = (avatarUrl: string | null) => {
    if (profileData) {
      setProfileData({
        ...profileData,
        profile: profileData.profile
          ? {
              ...profileData.profile,
              avatar_url: avatarUrl,
            }
          : null,
      })
    }
  }

  const handleBioChange = (bio: string) => {
    if (profileData) {
      setProfileData({
        ...profileData,
        profile: profileData.profile
          ? {
              ...profileData.profile,
              bio,
            }
          : null,
      })
    }
  }

  const handleSocialProfilesChange = (profiles: unknown) => {
    if (profileData) {
      setProfileData({
        ...profileData,
        social_profiles: profiles as SocialProfile[],
      })
    }
  }

  const handleCertificationsChange = (certifications: unknown) => {
    if (profileData) {
      setProfileData({
        ...profileData,
        certifications: certifications as Certification[],
      })
    }
  }

  const handleAvailabilityChange = (status: 'available' | 'limited' | 'unavailable') => {
    if (profileData) {
      setProfileData({
        ...profileData,
        profile: profileData.profile
          ? {
              ...profileData.profile,
              availability_status: status,
            }
          : null,
      })
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-default-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 space-y-6">
                <div className="h-64 bg-default-200 rounded"></div>
                <div className="h-48 bg-default-200 rounded"></div>
              </div>
              <div className="h-96 bg-default-200 rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <ModernErrorBoundary>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Coach Profile
              </h1>
              {isCoach && (
                <Chip color="primary" variant="flat">
                  Coach Account
                </Chip>
              )}
            </div>
            <p className="text-foreground-600 text-lg">
              Build your coaching profile to attract and inspire athletes
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Avatar and Basic Info */}
              <Card className="border border-divider">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold text-foreground">Account Information</h2>
                  </div>
                </CardHeader>
                <Divider />
                <CardBody className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Avatar Upload */}
                    <div className="flex-shrink-0">
                      <AvatarUpload
                        currentAvatarUrl={profileData?.profile?.avatar_url}
                        onAvatarChange={handleAvatarChange}
                        size="lg"
                        userName={user.name}
                      />
                    </div>

                    {/* Basic Info Form */}
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* About Me Section */}
              <AboutMeSection
                bio={profileData?.profile?.bio}
                onBioChange={handleBioChange}
                isEditable={true}
              />

              {/* Certifications & Specialties */}
              {isCoach && (
                <CertificationsSection
                  certifications={profileData?.certifications || []}
                  onCertificationsChange={handleCertificationsChange}
                  isEditable={true}
                />
              )}

              {/* Social Profiles */}
              <SocialProfiles
                userId={user.id}
                profiles={profileData?.social_profiles || []}
                onProfilesChange={handleSocialProfilesChange}
                stravaConnected={profileData?.strava_connected}
                stravaUsername={profileData?.strava_username ?? undefined}
              />

              {/* UltraSignup Results - Hidden until implementation is complete */}
              {/* 
              <UltraSignupResults
                connection={null}
                results={[]}
                onConnectionChange={() => {}}
                onResultsChange={() => {}}
                isEditable={true}
              />
              */}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Work With Me Card (for coaches) */}
              {isCoach && (
                <WorkWithMeCard
                  coachStats={
                    profileData?.coach_statistics || {
                      total_athletes: 0,
                      active_athletes: 0,
                      average_rating: 0,
                      total_reviews: 0,
                      years_coaching: 0,
                      success_stories: 0,
                    }
                  }
                  availabilityStatus={profileData?.profile?.availability_status || 'available'}
                  onAvailabilityChange={handleAvailabilityChange}
                  isOwnProfile={true}
                />
              )}

              {/* Account Summary */}
              <Card className="border border-divider">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-foreground">Account Summary</h3>
                </CardHeader>
                <Divider />
                <CardBody className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-600">Account Type:</span>
                    <span className="font-medium capitalize">{user.userType || 'Runner'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-600">Member Since:</span>
                    <span className="font-medium">{formatMonthYear(user.createdAt)}</span>
                  </div>
                </CardBody>
              </Card>

              {/* Quick Actions */}
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
                    onPress={() => router.push('/dashboard')}
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
