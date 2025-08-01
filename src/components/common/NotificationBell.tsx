'use client'

import {
  Badge,
  Button,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
} from '@heroui/react'
import classNames from 'classnames'
import { formatDistanceToNow } from 'date-fns'
import { BellIcon, CheckIcon } from 'lucide-react'

import { useNotifications } from '@/hooks/useNotifications'

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'workout':
        return '🏃'
      case 'training_plan':
        return '📋'
      case 'message':
        return '💬'
      case 'race':
        return '🏁'
      default:
        return '📢'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'workout':
        return 'success'
      case 'training_plan':
        return 'primary'
      case 'message':
        return 'secondary'
      case 'race':
        return 'warning'
      default:
        return 'default'
    }
  }

  const handleNotificationClick = async (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      await markAsRead(notificationId)
    }
  }

  return (
    <Dropdown placement="bottom-end" className="min-w-80">
      <DropdownTrigger>
        <Button variant="light" isIconOnly className="relative">
          <Badge
            content={unreadCount > 0 ? unreadCount.toString() : ''}
            color="danger"
            size="sm"
            isInvisible={unreadCount === 0}
          >
            <BellIcon className="w-5 h-5" />
          </Badge>
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Notifications" variant="flat" className="max-h-96 overflow-y-auto">
        <DropdownSection showDivider>
          <DropdownItem key="header" className="h-14 gap-2" textValue="Notifications Header">
            <div className="flex justify-between items-center w-full">
              <div className="flex flex-col">
                <span className="text-medium font-semibold">🏔️ Base Camp Updates</span>
                <span className="text-small text-default-400">
                  {unreadCount > 0 ? `${unreadCount} new notifications` : 'All caught up!'}
                </span>
              </div>
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  startContent={<CheckIcon className="w-3 h-3" />}
                  onPress={markAllAsRead}
                >
                  Mark all read
                </Button>
              )}
            </div>
          </DropdownItem>
        </DropdownSection>

        <DropdownSection>
          {notifications.length === 0 ? (
            <DropdownItem key="empty" textValue="No notifications">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BellIcon className="w-8 h-8 text-default-300 mb-2" />
                <p className="text-default-400">No notifications yet</p>
                <p className="text-small text-default-300">
                  You&apos;ll see updates about your training here
                </p>
              </div>
            </DropdownItem>
          ) : (
            <>
              {notifications.slice(0, 10).map(notification => (
                <DropdownItem
                  key={notification.id}
                  className={classNames(
                    'p-3 border-l-3',
                    !notification.read ? 'bg-primary-50 border-l-primary' : 'border-l-transparent'
                  )}
                  textValue={notification.title}
                  onPress={() => handleNotificationClick(notification.id, notification.read)}
                >
                  <div className="flex gap-3 w-full">
                    <div className="shrink-0 text-xl">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={classNames(
                            'text-sm font-medium truncate',
                            !notification.read && 'text-primary-700'
                          )}
                        >
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary-500 rounded-full shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-default-500 line-clamp-2 mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <Chip
                          size="sm"
                          variant="flat"
                          color={getNotificationColor(notification.type)}
                        >
                          {notification.type}
                        </Chip>
                        <span className="text-xs text-default-400">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </DropdownItem>
              ))}
              {notifications.length > 10 && (
                <DropdownItem key="view-all" textValue="View all notifications">
                  <div className="text-center text-primary-600 text-sm font-medium py-2">
                    View all {notifications.length} notifications
                  </div>
                </DropdownItem>
              )}
            </>
          )}
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  )
}
