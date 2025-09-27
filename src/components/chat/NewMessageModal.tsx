'use client'

import { Button, Input, Modal, ModalBody, ModalContent, ModalHeader } from '@heroui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAtomValue } from 'jotai'
import { z } from 'zod'

import { Suspense, useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { useRouter } from 'next/navigation'

import { useSession } from '@/hooks/useBetterSession'
import { availableCoachesAtom, connectedRunnersAtom } from '@/lib/atoms/index'
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

function NewMessageModalContent({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { data: session } = useSession()
  const router = useRouter()
  const connectedRunners = useAtomValue(connectedRunnersAtom)
  const availableCoaches = useAtomValue(availableCoachesAtom)

  // React Hook Form setup
  const { control, watch, reset } = useForm<SearchForm>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      searchTerm: '',
    },
  })

  const searchTerm = watch('searchTerm') || ''

  // Memoize available users to stabilize dependency for filteredUsers
  const availableUsers = useMemo(() => {
    if (session?.user?.userType === 'coach') {
      return connectedRunners || []
    } else {
      // For runners, show available coaches
      return availableCoaches || []
    }
  }, [session?.user?.userType, connectedRunners, availableCoaches])

  useEffect(() => {
    // Clear the search term whenever the modal is opened
    if (isOpen) {
      reset({ searchTerm: '' })
    }
  }, [isOpen, reset])

  const handleStartConversation = (userId: string) => {
    logger.info('Starting conversation:', { userId, userRole: session?.user?.userType })
    onClose()
    router.push(`/chat/${userId}`)
  }

  const q = (searchTerm || '').toLowerCase()
  const filteredUsers = useMemo(
    () =>
      availableUsers.filter((user: User) => {
        const name = (user.full_name || '').toLowerCase()
        const email = (user.email || '').toLowerCase()
        return name.includes(q) || email.includes(q)
      }),
    [availableUsers, q]
  )

  return (
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
                : `No ${session?.user?.userType === 'coach' ? 'runners' : 'coaches'} found`}
            </h3>
            <p className="mt-2 text-sm text-default-500">
              {session?.user?.userType === 'coach'
                ? 'Create training plans to connect with runners'
                : 'Ask your coach to create a training plan for you'}
            </p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {filteredUsers.map((user: User) => (
              <Button
                key={user.id}
                variant="flat"
                className="w-full flex items-center p-3 rounded-lg text-left justify-start"
                onPress={() => handleStartConversation(user.id)}
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
                  <p className="text-sm text-default-500 truncate">{user.email || 'No email'}</p>
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
  )
}

export default function NewMessageModal({ isOpen, onClose }: NewMessageModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      data-testid="new-message-modal"
    >
      <ModalContent>
        {/* Keep header outside Suspense to prevent layout shift */}
        <ModalHeader className="border-b border-divider">New Message</ModalHeader>
        <Suspense
          fallback={
            <ModalBody data-testid="new-message-modal-skeleton">
              <div className="space-y-4 py-6">
                {/* search field skeleton */}
                <div className="h-10 rounded-md bg-default-200 animate-pulse" />
                {/* list rows */}
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-default-200 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 rounded bg-default-200 animate-pulse w-1/3" />
                        <div className="h-3 rounded bg-default-200 animate-pulse w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ModalBody>
          }
        >
          <NewMessageModalContent isOpen={isOpen} onClose={onClose} />
        </Suspense>
      </ModalContent>
    </Modal>
  )
}
