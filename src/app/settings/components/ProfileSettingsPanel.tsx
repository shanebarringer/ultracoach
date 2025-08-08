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
  Textarea,
} from '@heroui/react'
import { MailIcon, MapPinIcon, UserIcon } from 'lucide-react'

import { useState } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'

const logger = createLogger('ProfileSettingsPanel')

export default function ProfileSettingsPanel() {
  const { data: session } = useSession()
  const [saving, setSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    fullName: session?.user?.name || '',
    email: session?.user?.email || '',
    location: '',
    timeZone: '',
    bio: '',
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      // Profile updates would typically go to a separate profile API
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      toast.success('✅ Profile Updated', 'Your profile information has been saved.')
      logger.info('Profile updated successfully')
    } catch (error) {
      logger.error('Error updating profile:', error)
      toast.error('❌ Update Failed', 'Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges =
    profileData.fullName !== (session?.user?.name || '') ||
    profileData.email !== (session?.user?.email || '')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Basic Information</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={profileData.fullName}
              onValueChange={value => setProfileData(prev => ({ ...prev, fullName: value }))}
              startContent={<UserIcon className="w-4 h-4 text-foreground-400" />}
              placeholder="Enter your full name"
            />

            <Input
              label="Email Address"
              type="email"
              value={profileData.email}
              onValueChange={value => setProfileData(prev => ({ ...prev, email: value }))}
              startContent={<MailIcon className="w-4 h-4 text-foreground-400" />}
              placeholder="your@email.com"
              description="Used for account access and notifications"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Location"
              value={profileData.location}
              onValueChange={value => setProfileData(prev => ({ ...prev, location: value }))}
              startContent={<MapPinIcon className="w-4 h-4 text-foreground-400" />}
              placeholder="City, State/Country"
              description="Help others find training partners nearby"
            />

            <Select
              label="Time Zone"
              selectedKeys={profileData.timeZone ? [profileData.timeZone] : []}
              onSelectionChange={keys => {
                const value = Array.from(keys)[0] as string
                setProfileData(prev => ({ ...prev, timeZone: value || '' }))
              }}
              placeholder="Select your time zone"
            >
              <SelectItem key="Pacific/Honolulu">Hawaii (HST)</SelectItem>
              <SelectItem key="America/Anchorage">Alaska (AKST)</SelectItem>
              <SelectItem key="America/Los_Angeles">Pacific (PST)</SelectItem>
              <SelectItem key="America/Denver">Mountain (MST)</SelectItem>
              <SelectItem key="America/Chicago">Central (CST)</SelectItem>
              <SelectItem key="America/New_York">Eastern (EST)</SelectItem>
            </Select>
          </div>

          <Textarea
            label="Bio"
            value={profileData.bio}
            onValueChange={value => setProfileData(prev => ({ ...prev, bio: value }))}
            placeholder="Tell others about your running journey, goals, or what motivates you..."
            description="This helps coaches and other runners connect with you"
            minRows={3}
            maxLength={500}
          />
        </CardBody>
      </Card>

      <Card className="bg-info-50 border-info-200">
        <CardHeader>
          <h3 className="text-lg font-semibold text-info-800">Account Security</h3>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-info-800">Change Password</p>
                <p className="text-sm text-info-600">
                  Update your password to keep your account secure
                </p>
              </div>
              <Button variant="flat" color="primary" size="sm">
                Change Password
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-info-800">Two-Factor Authentication</p>
                <p className="text-sm text-info-600">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Button variant="flat" color="secondary" size="sm">
                Enable 2FA
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {hasChanges && (
        <div className="flex justify-end">
          <Button color="primary" onPress={handleSave} isLoading={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      )}
    </div>
  )
}
