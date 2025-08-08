'use client'

import { Card, CardBody, CardHeader, Divider, Skeleton, Tab, Tabs } from '@heroui/react'
import {
  BellIcon,
  MessageSquareIcon,
  PaletteIcon,
  RulerIcon,
  ShieldIcon,
  TargetIcon,
  UserIcon,
} from 'lucide-react'

import { useState } from 'react'

import { useUserSettings } from '@/hooks/useUserSettings'

import CommunicationSettingsPanel from './components/CommunicationSettingsPanel'
import DisplaySettingsPanel from './components/DisplaySettingsPanel'
import NotificationSettingsPanel from './components/NotificationSettingsPanel'
import PrivacySettingsPanel from './components/PrivacySettingsPanel'
import ProfileSettingsPanel from './components/ProfileSettingsPanel'
import TrainingSettingsPanel from './components/TrainingSettingsPanel'
import UnitSettingsPanel from './components/UnitSettingsPanel'

export default function SettingsPage() {
  const { settings, loading, error } = useUserSettings()
  const [activeTab, setActiveTab] = useState<string>('profile')

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-64">
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="border border-danger-200 bg-danger-50">
          <CardBody>
            <div className="text-center py-8">
              <div className="text-danger-600 mb-4">
                <ShieldIcon className="w-12 h-12 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-danger-800 mb-2">
                Failed to Load Settings
              </h2>
              <p className="text-danger-700">{error}</p>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  const settingsTabs = [
    {
      key: 'profile',
      title: 'Profile',
      icon: <UserIcon className="w-4 h-4" />,
      component: <ProfileSettingsPanel />,
    },
    {
      key: 'notifications',
      title: 'Notifications',
      icon: <BellIcon className="w-4 h-4" />,
      component: <NotificationSettingsPanel settings={settings} />,
    },
    {
      key: 'display',
      title: 'Display',
      icon: <PaletteIcon className="w-4 h-4" />,
      component: <DisplaySettingsPanel settings={settings} />,
    },
    {
      key: 'units',
      title: 'Units',
      icon: <RulerIcon className="w-4 h-4" />,
      component: <UnitSettingsPanel settings={settings} />,
    },
    {
      key: 'privacy',
      title: 'Privacy',
      icon: <ShieldIcon className="w-4 h-4" />,
      component: <PrivacySettingsPanel settings={settings} />,
    },
    {
      key: 'communication',
      title: 'Communication',
      icon: <MessageSquareIcon className="w-4 h-4" />,
      component: <CommunicationSettingsPanel settings={settings} />,
    },
    {
      key: 'training',
      title: 'Training',
      icon: <TargetIcon className="w-4 h-4" />,
      component: <TrainingSettingsPanel settings={settings} />,
    },
  ]

  const activeTabData = settingsTabs.find(tab => tab.key === activeTab)

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-foreground-600">
          Customize your UltraCoach experience with these preferences and controls.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs - Mobile: Horizontal, Desktop: Vertical */}
        <div className="lg:w-64">
          <Card className="sticky top-6">
            <CardBody className="p-2">
              <Tabs
                selectedKey={activeTab}
                onSelectionChange={key => setActiveTab(key as string)}
                variant="light"
                classNames={{
                  tabList: 'w-full flex-col',
                  tab: 'justify-start h-12 px-4',
                  tabContent: 'group-data-[selected=true]:text-primary',
                }}
              >
                {settingsTabs.map(tab => (
                  <Tab
                    key={tab.key}
                    title={
                      <div className="flex items-center gap-3">
                        {tab.icon}
                        <span>{tab.title}</span>
                      </div>
                    }
                  />
                ))}
              </Tabs>
            </CardBody>
          </Card>
        </div>

        {/* Settings Panel */}
        <div className="flex-1">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                {activeTabData?.icon}
                <h2 className="text-2xl font-semibold">{activeTabData?.title} Settings</h2>
              </div>
            </CardHeader>
            <Divider />
            <CardBody className="pt-6">{activeTabData?.component}</CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
