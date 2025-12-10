'use client'

import { Button, Card, CardBody, CardHeader, Divider, Textarea } from '@heroui/react'
import { Edit3, Save } from 'lucide-react'

import { useState } from 'react'

import { createLogger } from '@/lib/logger'
import { commonToasts } from '@/lib/toast'

const logger = createLogger('AboutMeSection')

interface AboutMeSectionProps {
  bio?: string | null
  onBioChange: (bio: string) => void
  isEditable?: boolean
}

const MAX_BIO_LENGTH = 1000

export default function AboutMeSection({
  bio,
  onBioChange,
  isEditable = true,
}: AboutMeSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedBio, setEditedBio] = useState(bio || '')
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    if (editedBio.length > MAX_BIO_LENGTH) {
      commonToasts.saveError(`Bio must be ${MAX_BIO_LENGTH} characters or less`)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ bio: editedBio }),
      })

      if (!response.ok) {
        throw new Error('Failed to update bio')
      }

      onBioChange(editedBio)
      setIsEditing(false)
      commonToasts.saveSuccess()
      logger.info('Bio updated successfully')
    } catch (error) {
      logger.error('Failed to update bio:', error)
      commonToasts.saveError('Failed to update bio')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setEditedBio(bio || '')
    setIsEditing(false)
  }

  const getCharacterCount = () => editedBio.length
  const isOverLimit = () => getCharacterCount() > MAX_BIO_LENGTH

  const renderBioContent = () => {
    if (!bio && !isEditing) {
      return (
        <div className="text-center py-8">
          <p className="text-foreground-600 mb-4">
            Tell potential athletes about your coaching experience, specialties, and approach.
          </p>
          {isEditable && (
            <Button
              color="primary"
              variant="flat"
              startContent={<Edit3 className="w-4 h-4" />}
              onPress={() => setIsEditing(true)}
            >
              Add Bio
            </Button>
          )}
        </div>
      )
    }

    if (isEditing) {
      return (
        <div className="space-y-4">
          <Textarea
            value={editedBio}
            onChange={e => setEditedBio(e.target.value)}
            placeholder="Ultramarathon coach with 15+ years of experience helping runners achieve their goals from 50K to 100 milers. I specialize in:

• First-time ultra finishers
• Mountain and trail racing
• Heat and altitude adaptation
• Nutrition strategy for long distances

I've coached athletes to podium finishes at Western States, UTMB, and Leadville. My approach combines data-driven training with mental preparation to help you become the strongest version of yourself."
            minRows={8}
            maxRows={12}
            variant="bordered"
            className="text-sm"
            classNames={{
              input: 'resize-none',
            }}
          />

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className={isOverLimit() ? 'text-danger' : 'text-foreground-600'}>
                {getCharacterCount()}/{MAX_BIO_LENGTH} characters
              </span>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="light" onPress={handleCancel} isDisabled={isLoading}>
                Cancel
              </Button>
              <Button
                size="sm"
                color="primary"
                startContent={<Save className="w-4 h-4" />}
                onPress={handleSave}
                isLoading={isLoading}
                isDisabled={isOverLimit()}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="prose prose-sm max-w-none text-foreground-700">
          {bio?.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-3 last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>

        {isEditable && (
          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              variant="flat"
              startContent={<Edit3 className="w-4 h-4" />}
              onPress={() => setIsEditing(true)}
            >
              Edit
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="border border-divider">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="flex items-center justify-between w-full">
          <h3 className="text-lg font-semibold text-foreground">About Me</h3>
          {isEditable && bio && !isEditing && (
            <Button
              size="sm"
              variant="flat"
              startContent={<Edit3 className="w-4 h-4" />}
              onPress={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <Divider />
      <CardBody>{renderBioContent()}</CardBody>
    </Card>
  )
}
