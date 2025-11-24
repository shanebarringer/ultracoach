'use client'

import { Card, CardBody, CardHeader, Divider, Tab, Tabs } from '@heroui/react'
import { useAtomValue } from 'jotai'
import {
  Activity,
  BellIcon,
  MessageSquareIcon,
  PaletteIcon,
  RulerIcon,
  ShieldIcon,
  TargetIcon,
  UserIcon,
} from 'lucide-react'

import { useState } from 'react'

import { FeatureFlagGuard } from '@/components/feature-flags/FeatureFlagGuard'
import Layout from '@/components/layout/Layout'
import { asyncUserSettingsAtom } from '@/lib/atoms'

import CommunicationSettingsPanel from './components/CommunicationSettingsPanel'
import DisplaySettingsPanel from './components/DisplaySettingsPanel'
import IntegrationsSettingsPanel from './components/IntegrationsSettingsPanel'
import NotificationSettingsPanel from './components/NotificationSettingsPanel'
import PrivacySettingsPanel from './components/PrivacySettingsPanel'
import ProfileSettingsPanel from './components/ProfileSettingsPanel'
import TrainingSettingsPanel from './components/TrainingSettingsPanel'
import UnitSettingsPanel from './components/UnitSettingsPanel'

interface SettingsPageClientProps {
  user: {
    id: string
    email: string
    name: string | null
    role: 'coach' | 'runner'
  }
}

export default function SettingsPageClient({ user: _user }: SettingsPageClientProps) {
  // Use async atom - Suspense at page level handles loading state
  const settings = useAtomValue(asyncUserSettingsAtom)
  const [activeTab, setActiveTab] = useState<string>('profile')

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
    {
      key: 'integrations',
      title: 'Integrations',
      icon: <Activity className="w-4 h-4" />,
      component: <IntegrationsSettingsPanel />,
    },
  ]

  const activeTabData = settingsTabs.find(tab => tab.key === activeTab)

  return (
    <FeatureFlagGuard
      flagKey="settings-functionality"
      defaultValue={false}
      fallback={
        <Layout>
          <div className="container mx-auto max-w-4xl px-4 py-12">
            <Card className="border-2 border-mountain-mist/30 bg-gradient-to-br from-white to-mountain-snow/30 shadow-xl dark:from-mountain-shadow dark:to-mountain-shadow/80">
              <CardBody className="gap-6 p-8">
                <div className="text-center">
                  <h2 className="mb-4 text-3xl font-bold text-mountain-peak dark:text-mountain-snow">
                    🏔️ Advanced Settings Coming Soon
                  </h2>
                  <p className="text-lg text-mountain-ridge dark:text-mountain-mist">
                    We&apos;re building comprehensive settings to give you complete control over
                    your training experience.
                  </p>
                  <div className="mt-8 space-y-3">
                    <div className="flex items-center justify-center gap-3 text-mountain-ridge dark:text-mountain-mist">
                      <BellIcon className="h-5 w-5" />
                      <span>Advanced notification preferences</span>
                    </div>
                    <div className="flex items-center justify-center gap-3 text-mountain-ridge dark:text-mountain-mist">
                      <RulerIcon className="h-5 w-5" />
                      <span>Unit conversion & display options</span>
                    </div>
                    <div className="flex items-center justify-center gap-3 text-mountain-ridge dark:text-mountain-mist">
                      <ShieldIcon className="h-5 w-5" />
                      <span>Privacy & communication controls</span>
                    </div>
                    <div className="flex items-center justify-center gap-3 text-mountain-ridge dark:text-mountain-mist">
                      <TargetIcon className="h-5 w-5" />
                      <span>Training preferences</span>
                    </div>
                  </div>
                  <p className="mt-8 text-sm text-mountain-mist dark:text-mountain-ridge">
                    Stay tuned for updates as we roll out these features!
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        </Layout>
      }
    >
      <Layout>
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
      </Layout>
    </FeatureFlagGuard>
  )
}
