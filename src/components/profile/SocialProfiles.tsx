'use client'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from '@heroui/react'
import { Check, ExternalLink, Instagram, Plus, Twitter, X, Youtube } from 'lucide-react'

import { useState } from 'react'

import { createLogger } from '@/lib/logger'
import { commonToasts } from '@/lib/toast'

const logger = createLogger('SocialProfiles')

interface SocialProfile {
  id: string
  platform: string
  username?: string
  profile_url: string
  display_name?: string
  is_verified: boolean
  is_public: boolean
}

interface SocialProfilesProps {
  userId: string
  profiles: SocialProfile[]
  onProfilesChange: (profiles: SocialProfile[]) => void
  stravaConnected?: boolean
  stravaUsername?: string
}

const SOCIAL_PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-500',
    placeholder: 'instagram.com/username',
    urlPattern: /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/,
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: Twitter,
    color: 'text-blue-500',
    placeholder: 'x.com/username',
    urlPattern: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/?$/,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    color: 'text-red-500',
    placeholder: 'youtube.com/@username',
    urlPattern: /^https?:\/\/(www\.)?youtube\.com\/(c\/|channel\/|@)[a-zA-Z0-9_-]+\/?$/,
  },
]

export default function SocialProfiles({
  userId,
  profiles,
  onProfilesChange,
  stravaConnected = false,
  stravaUsername,
}: SocialProfilesProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [selectedPlatform, setSelectedPlatform] = useState<string>('')
  const [profileUrl, setProfileUrl] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const getConnectedPlatforms = () => {
    const connected = new Set(profiles.map(p => p.platform))
    if (stravaConnected) connected.add('strava')
    return connected
  }

  const getAvailablePlatforms = () => {
    const connected = getConnectedPlatforms()
    return SOCIAL_PLATFORMS.filter(platform => !connected.has(platform.id))
  }

  const handleAddProfile = async () => {
    if (!selectedPlatform || !profileUrl) return

    const platform = SOCIAL_PLATFORMS.find(p => p.id === selectedPlatform)
    if (!platform) return

    // Validate URL format
    if (!platform.urlPattern.test(profileUrl)) {
      commonToasts.saveError(`Please enter a valid ${platform.name} URL`)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/profile/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform,
          profile_url: profileUrl,
          display_name: displayName || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add social profile')
      }

      const newProfile = await response.json()
      onProfilesChange([...profiles, newProfile])

      // Reset form
      setSelectedPlatform('')
      setProfileUrl('')
      setDisplayName('')
      onClose()

      commonToasts.saveSuccess()
      logger.info('Social profile added', { platform: selectedPlatform, userId })
    } catch (error) {
      logger.error('Failed to add social profile:', error)
      commonToasts.saveError('Failed to add social profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveProfile = async (profileId: string, _platformName: string) => {
    try {
      const response = await fetch(`/api/profile/social/${profileId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove social profile')
      }

      onProfilesChange(profiles.filter(p => p.id !== profileId))
      commonToasts.deleteSuccess()
      logger.info('Social profile removed', { profileId, userId })
    } catch (error) {
      logger.error('Failed to remove social profile:', error)
      commonToasts.deleteError('Failed to remove social profile')
    }
  }

  const openAddModal = (platformId?: string) => {
    if (platformId) {
      setSelectedPlatform(platformId)
    }
    onOpen()
  }

  return (
    <Card className="border border-divider">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="flex items-center justify-between w-full">
          <h3 className="text-lg font-semibold text-foreground">Social Profiles</h3>
          <Button
            size="sm"
            color="primary"
            variant="flat"
            startContent={<Plus className="w-4 h-4" />}
            onPress={() => openAddModal()}
            isDisabled={getAvailablePlatforms().length === 0}
          >
            Add
          </Button>
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="space-y-4">
        {/* Strava Connection */}
        {stravaConnected && (
          <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Strava</p>
                <p className="text-sm text-foreground-600">{stravaUsername || 'Connected'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              <span className="text-sm text-success font-medium">Connected</span>
              <Button isIconOnly size="sm" variant="light" as="a" href="/settings/integrations">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Other Social Profiles */}
        {profiles.map(profile => {
          const platform = SOCIAL_PLATFORMS.find(p => p.id === profile.platform)
          if (!platform) return null

          const IconComponent = platform.icon

          return (
            <div
              key={profile.id}
              className="flex items-center justify-between p-3 bg-default-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <IconComponent className={`w-6 h-6 ${platform.color}`} />
                <div>
                  <p className="font-medium text-foreground">{platform.name}</p>
                  <p className="text-sm text-foreground-600">
                    {profile.display_name || profile.username || 'Connected'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  as="a"
                  href={profile.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  onPress={() => handleRemoveProfile(profile.id, platform.name)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )
        })}

        {/* Add More Profiles Buttons */}
        {getAvailablePlatforms().length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-foreground-600 mb-3">Add more profiles:</p>
            <div className="flex flex-wrap gap-2">
              {getAvailablePlatforms().map(platform => {
                const IconComponent = platform.icon
                return (
                  <Button
                    key={platform.id}
                    size="sm"
                    variant="bordered"
                    startContent={<IconComponent className={`w-4 h-4 ${platform.color}`} />}
                    onPress={() => openAddModal(platform.id)}
                  >
                    {platform.name}
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {profiles.length === 0 && !stravaConnected && (
          <div className="text-center py-8">
            <p className="text-foreground-600 mb-4">
              Connect your Strava profile to showcase your running history to potential athletes
            </p>
            <Button color="primary" variant="flat" as="a" href="/settings/integrations">
              Connect Strava
            </Button>
          </div>
        )}
      </CardBody>

      {/* Add Profile Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalContent>
          <ModalHeader>Add Social Profile</ModalHeader>
          <ModalBody className="space-y-4">
            {!selectedPlatform ? (
              <div className="space-y-3">
                <p className="text-foreground-600">Select a platform:</p>
                {getAvailablePlatforms().map(platform => {
                  const IconComponent = platform.icon
                  return (
                    <Button
                      key={platform.id}
                      variant="bordered"
                      className="w-full justify-start"
                      startContent={<IconComponent className={`w-5 h-5 ${platform.color}`} />}
                      onPress={() => setSelectedPlatform(platform.id)}
                    >
                      {platform.name}
                    </Button>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const platform = SOCIAL_PLATFORMS.find(p => p.id === selectedPlatform)
                  if (!platform) return null
                  const IconComponent = platform.icon

                  return (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <IconComponent className={`w-6 h-6 ${platform.color}`} />
                        <h4 className="text-lg font-medium">{platform.name}</h4>
                      </div>

                      <Input
                        label="Profile URL"
                        placeholder={platform.placeholder}
                        value={profileUrl}
                        onChange={e => setProfileUrl(e.target.value)}
                        startContent={<ExternalLink className="w-4 h-4 text-foreground-400" />}
                        variant="bordered"
                        isRequired
                      />

                      <Input
                        label="Display Name (Optional)"
                        placeholder="How you want it to appear"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        variant="bordered"
                      />
                    </>
                  )
                })()}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => {
                setSelectedPlatform('')
                setProfileUrl('')
                setDisplayName('')
                onClose()
              }}
            >
              Cancel
            </Button>
            {selectedPlatform && (
              <Button
                color="primary"
                onPress={handleAddProfile}
                isLoading={isLoading}
                isDisabled={!profileUrl}
              >
                Add Profile
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  )
}
