'use client'

import { Button, Input, Modal, ModalBody, ModalContent, ModalHeader } from '@heroui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAtom } from 'jotai'
import { z } from 'zod'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { useRouter } from 'next/navigation'

import { useSession } from '@/hooks/useBetterSession'
import { connectedRunnersDataAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { User } from '@/lib/supabase'

const logger = createLogger('NewMessageModal')

// Zod schema for search form validation
const searchSchema = z.object({
  searchTerm: z.string().max(100, 'Search term must be less than 100 characters').optional(),
})

type SearchForm = z.infer<typeof searchSchema>

interface NewMessageModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewMessageModal({ isOpen, onClose }: NewMessageModalProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [connectedRunners] = useAtom(connectedRunnersDataAtom)

  // React Hook Form setup
  const { control, watch, reset } = useForm<SearchForm>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      searchTerm: '',
    },
  })

  const searchTerm = watch('searchTerm') || ''

  // Directly derive available users from atoms - no useState needed
  const availableUsers = session?.user?.role === 'coach' ? connectedRunners || [] : []

  useEffect(() => {
    if (isOpen) {
      reset({ searchTerm: '' })
    }
  }, [isOpen, reset])

  const handleStartConversation = (userId: string) => {
    logger.info('Starting conversation:', { userId, userRole: session?.user?.role })
    onClose()
    router.push(`/chat/${userId}`)
  }

  const filteredUsers = availableUsers.filter(
    (user: User) =>
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      scrollBehavior="inside"
      data-testid="new-message-modal"
    >
      <ModalContent>
        <ModalHeader className="border-b border-divider">New Message</ModalHeader>
        <ModalBody className="overflow-y-auto py-6">
          <Controller
            name="searchTerm"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                {...field}
                type="text"
                placeholder="Search by name or email..."
                isInvalid={!!fieldState.error}
                errorMessage={fieldState.error?.message}
                className="mb-6"
              />
            )}
          />
          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-16 w-16 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {searchTerm
                    ? 'No users found'
                    : `No ${session?.user?.role === 'coach' ? 'runners' : 'coaches'} found`}
                </h3>
                <p className="mt-2 text-sm text-default-500">
                  {session?.user?.role === 'coach'
                    ? 'Create training plans to connect with runners'
                    : 'Ask your coach to create a training plan for you'}
                </p>
              </div>
            ) : (
              <div className="">
                {filteredUsers.map((user: User) => (
                  <Button
                    key={user.id}
                    variant="flat"
                    className="w-full flex items-center p-3 rounded-lg text-left justify-start height-[400px] overflow-y-auto"
                    onClick={() => handleStartConversation(user.id)}
                    data-testid={`user-option-${user.id}`}
                    size="lg"
                  >
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-medium mr-3">
                      {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground truncate">
                        {user.full_name || 'Unknown User'}
                      </h3>
                      <p className="text-sm text-default-500 truncate">
                        {user.email || 'No email'}
                      </p>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
