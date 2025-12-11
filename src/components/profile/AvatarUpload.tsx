'use client'

import { Button } from '@heroui/react'
import { Camera, X } from 'lucide-react'

import { useCallback, useRef, useState } from 'react'

import Image from 'next/image'

// import { useDropzone } from 'react-dropzone' // TODO: Install react-dropzone

import { createLogger } from '@/lib/logger'
import { commonToasts } from '@/lib/toast'

const logger = createLogger('AvatarUpload')

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  onAvatarChange: (avatarUrl: string | null) => void
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  userName?: string | null
}

export default function AvatarUpload({
  currentAvatarUrl,
  onAvatarChange,
  size = 'lg',
  disabled = false,
  userName,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return

      const file = acceptedFiles[0]

      // Validate file type
      if (!file.type.startsWith('image/')) {
        commonToasts.saveError('Please select an image file')
        return
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        commonToasts.saveError('Image must be smaller than 5MB')
        return
      }

      setIsUploading(true)

      try {
        // Create preview URL
        const preview = URL.createObjectURL(file)
        setPreviewUrl(preview)

        // Create form data for upload
        const formData = new FormData()
        formData.append('avatar', file)

        // Upload to server
        const response = await fetch('/api/upload/avatar', {
          method: 'POST',
          body: formData,
          credentials: 'same-origin',
        })

        if (!response.ok) {
          throw new Error('Failed to upload avatar')
        }

        const { avatarUrl } = await response.json()

        // Update parent component
        onAvatarChange(avatarUrl)
        setPreviewUrl(avatarUrl)

        commonToasts.saveSuccess()
        logger.info('Avatar uploaded successfully', { avatarUrl })
      } catch (error) {
        logger.error('Avatar upload failed:', error)
        commonToasts.saveError('Failed to upload avatar')

        // Reset preview on error
        setPreviewUrl(currentAvatarUrl || null)
      } finally {
        setIsUploading(false)
      }
    },
    [currentAvatarUrl, onAvatarChange]
  )

  // Simplified file input without dropzone for now
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      onDrop([files[0]])
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      setIsUploading(true)

      // Call API to remove avatar
      const response = await fetch('/api/upload/avatar', {
        method: 'DELETE',
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error('Failed to remove avatar')
      }

      onAvatarChange(null)
      setPreviewUrl(null)
      commonToasts.deleteSuccess()
      logger.info('Avatar removed successfully')
    } catch (error) {
      logger.error('Avatar removal failed:', error)
      commonToasts.deleteError('Failed to remove avatar')
    } finally {
      setIsUploading(false)
    }
  }

  const getInitials = (name?: string | null) => {
    if (!name) return 'UC' // UltraCoach default
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleAvatarClick = () => {
    if (!isUploading && !disabled) {
      fileInputRef.current?.click()
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleAvatarClick()
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <button
          type="button"
          className={`
            relative ${sizeClasses[size]} rounded-full overflow-hidden cursor-pointer
            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary
          `}
          onClick={handleAvatarClick}
          onKeyDown={handleKeyDown}
          disabled={disabled || isUploading}
          aria-label="Upload profile picture"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isUploading}
          />

          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Profile avatar"
              fill
              className="object-cover"
              sizes="128px"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-foreground-600">
                {getInitials(userName)}
              </span>
            </div>
          )}

          {/* Camera overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            {isUploading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
            ) : (
              <Camera className={`${iconSizes[size]} text-white`} />
            )}
          </div>

          {/* Upload indicator - removed drag functionality for now */}
        </button>

        {/* Remove button */}
        {previewUrl && !isUploading && (
          <Button
            isIconOnly
            size="sm"
            color="danger"
            variant="solid"
            className="absolute -top-2 -right-2 min-w-6 h-6 rounded-full"
            onPress={handleRemoveAvatar}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      <div className="text-center">
        <p className="text-sm text-foreground-600 mb-2">Click to upload photo</p>
        <p className="text-xs text-foreground-400">JPG, PNG, GIF up to 5MB</p>
      </div>
    </div>
  )
}
