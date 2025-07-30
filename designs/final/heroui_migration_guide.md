# HeroUI Component Migration Guide

## Mountain Peak Hybrid Design Implementation

### 🎯 Overview

This guide provides step-by-step instructions for migrating existing UltraCoach components to the new Mountain Peak Hybrid design using HeroUI components. The migration maintains existing functionality while implementing the new visual design and improved UX patterns.

---

## 🏗️ Project Setup

### 1. Update Tailwind Configuration

**File: `tailwind.config.js`**

```javascript
const { heroui } = require('@heroui/theme')

module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'var(--font-geist-sans)', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'monospace'],
      },
    },
  },
  darkMode: 'class',
  plugins: [
    require('@tailwindcss/forms'),
    heroui({
      themes: {
        light: {
          colors: {
            // Mountain Peak Primary - Alpine Blue
            primary: {
              50: '#f0f9ff',
              100: '#e0f2fe',
              200: '#bae6fd',
              300: '#7dd3fc',
              400: '#38bdf8',
              500: '#0ea5e9',
              600: '#0284c7',
              700: '#0369a1',
              800: '#075985',
              900: '#0c4a6e',
              DEFAULT: '#0284c7',
              foreground: '#ffffff',
            },
            // Mountain Peak Secondary - Summit Gold
            secondary: {
              50: '#fffbeb',
              100: '#fef3c7',
              200: '#fde68a',
              300: '#fcd34d',
              400: '#fbbf24',
              500: '#f59e0b',
              600: '#d97706',
              700: '#b45309',
              800: '#92400e',
              900: '#78350f',
              DEFAULT: '#fbbf24',
              foreground: '#0f172a',
            },
            // Endurance Athlete Training Zones
            success: '#059669', // Zone 1 - Recovery
            warning: '#f97316', // Zone 3 - Tempo
            danger: '#ef4444', // Zone 4 - Threshold
            // Mountain Peak Neutrals - Granite Gray
            default: {
              50: '#f8fafc',
              100: '#f1f5f9',
              200: '#e2e8f0',
              300: '#cbd5e1',
              400: '#94a3b8',
              500: '#64748b',
              600: '#475569',
              700: '#334155',
              800: '#1e293b',
              900: '#0f172a',
              DEFAULT: '#64748b',
              foreground: '#0f172a',
            },
          },
        },
        dark: {
          colors: {
            // Mountain Peak Dark Mode
            primary: {
              50: '#0c4a6e',
              100: '#075985',
              200: '#0369a1',
              300: '#0284c7',
              400: '#0ea5e9',
              500: '#38bdf8',
              600: '#7dd3fc',
              700: '#bae6fd',
              800: '#e0f2fe',
              900: '#f0f9ff',
              DEFAULT: '#38bdf8',
              foreground: '#0f172a',
            },
            secondary: {
              DEFAULT: '#fbbf24',
              foreground: '#0f172a',
            },
            background: '#0f172a',
            foreground: '#f1f5f9',
            success: '#059669',
            warning: '#f97316',
            danger: '#ef4444',
            default: {
              DEFAULT: '#475569',
              foreground: '#f1f5f9',
            },
          },
        },
      },
    }),
  ],
}
```

### 2. Update CSS Variables

**File: `src/styles/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Mountain Peak Custom Properties */
    --alpine-blue-600: #0284c7;
    --summit-gold-400: #fbbf24;
    --granite-50: #f8fafc;
    --granite-900: #0f172a;

    /* Training Zone Colors */
    --zone-recovery: #059669;
    --zone-aerobic: #0ea5e9;
    --zone-tempo: #f59e0b;
    --zone-threshold: #ef4444;
    --zone-vo2max: #8b5cf6;

    /* Enhanced Shadows */
    --shadow-mountain: 0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.1);
  }

  .dark {
    --alpine-blue-600: #38bdf8;
    --granite-50: #0f172a;
    --granite-900: #f1f5f9;
  }
}

@layer components {
  /* Mountain Peak Enhancement Classes */
  .mountain-gradient {
    background: linear-gradient(135deg, var(--alpine-blue-600), var(--summit-gold-400));
  }

  .metric-card-mountain {
    @apply bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6;
    @apply hover:shadow-lg hover:-translate-y-1 transition-all duration-300;
    border-top: 4px solid var(--alpine-blue-600);
  }
}
```

---

## 🧩 Component Migration Instructions

### 1. Header Component Migration

**Current: `src/components/layout/Header.tsx`**

```typescript
// BEFORE - Mixed HeroUI and standard elements
export default function Header() {
  return (
    <Navbar>
      <NavbarBrand>UltraCoach</NavbarBrand>
      // ... existing implementation
    </Navbar>
  )
}
```

**After: Mountain Peak Hybrid Implementation**

```typescript
'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar
} from '@heroui/react'
import { useAtom } from 'jotai'
import { themeModeAtom } from '@/lib/atoms'
import { SunIcon, MoonIcon, BellIcon } from '@heroicons/react/24/outline'

function ThemeToggle() {
  const [themeMode, setThemeMode] = useAtom(themeModeAtom)

  const toggleTheme = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light')
  }

  return (
    <Button
      isIconOnly
      variant="light"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="hover:bg-primary/10 transition-colors"
    >
      {themeMode === 'light' ? (
        <SunIcon className="h-5 w-5" />
      ) : (
        <MoonIcon className="h-5 w-5" />
      )}
    </Button>
  )
}

export default function Header() {
  const { data: session } = useSession()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <Navbar
      onMenuOpenChange={setIsMenuOpen}
      isMenuOpen={isMenuOpen}
      className="bg-background/95 backdrop-blur-md border-b border-divider"
      height="4rem"
    >
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="md:hidden"
        />
        <NavbarBrand>
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🏔️</span>
            <span className="font-black text-xl bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              UltraCoach
            </span>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden md:flex gap-4" justify="center">
        {session && (
          <>
            <NavbarItem>
              <Link
                href={session.user.role === 'coach' ? '/dashboard/coach' : '/dashboard/runner'}
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                Dashboard
              </Link>
            </NavbarItem>
            {/* ... other nav items */}
          </>
        )}
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem>
          <Button
            isIconOnly
            variant="light"
            className="relative hover:bg-primary/10"
          >
            <BellIcon className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-danger text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              3
            </span>
          </Button>
        </NavbarItem>

        <NavbarItem>
          <ThemeToggle />
        </NavbarItem>

        {session && (
          <NavbarItem>
            <Dropdown>
              <DropdownTrigger>
                <Avatar
                  name={session.user.name || 'User'}
                  className="cursor-pointer bg-linear-to-br from-primary to-secondary text-white"
                />
              </DropdownTrigger>
              <DropdownMenu aria-label="User menu">
                <DropdownItem key="profile">Profile</DropdownItem>
                <DropdownItem key="settings">Settings</DropdownItem>
                <DropdownItem
                  key="logout"
                  color="danger"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  Sign Out
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </NavbarItem>
        )}
      </NavbarContent>
    </Navbar>
  )
}
```

### 2. Training Plan Card Migration

**Current: `src/components/training-plans/TrainingPlanCard.tsx`**

```typescript
// BEFORE - Basic HeroUI card
return (
  <Card>
    <CardHeader>
      <h3>{plan.title}</h3>
    </CardHeader>
    <CardBody>
      <p>{plan.description}</p>
    </CardBody>
  </Card>
)
```

**After: Mountain Peak Hybrid Enhancement**

```typescript
'use client'

import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Chip,
  Progress,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@heroui/react'
import { CalendarIcon, MapPinIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'
import type { TrainingPlan } from '@/lib/supabase'

interface TrainingPlanCardProps {
  plan: TrainingPlan
  userRole: string
  onArchiveChange?: () => void
}

export default function TrainingPlanCard({ plan, userRole, onArchiveChange }: TrainingPlanCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'primary'
      case 'completed': return 'success'
      case 'archived': return 'default'
      default: return 'warning'
    }
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'base': return 'success'  // Zone 1 color
      case 'build': return 'primary' // Zone 2 color
      case 'peak': return 'danger'   // Zone 4 color
      case 'taper': return 'secondary' // Zone 5 color
      default: return 'default'
    }
  }

  return (
    <Card
      className="hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border-t-4 border-t-primary/60"
      isPressable
    >
      <CardHeader className="flex justify-between items-start pb-2">
        <div className="flex flex-col">
          <h3 className="text-lg font-bold text-foreground">{plan.title}</h3>
          <p className="text-sm text-foreground-500">{plan.race_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Chip
            color={getStatusColor(plan.status)}
            size="sm"
            variant="flat"
            className="capitalize"
          >
            {plan.status}
          </Chip>
          {userRole === 'coach' && (
            <Dropdown>
              <DropdownTrigger>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  className="hover:bg-default-100"
                >
                  <EllipsisHorizontalIcon className="w-4 h-4" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu>
                <DropdownItem key="edit">Edit Plan</DropdownItem>
                <DropdownItem key="duplicate">Duplicate</DropdownItem>
                <DropdownItem
                  key="archive"
                  color="warning"
                  onClick={onArchiveChange}
                >
                  Archive
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
      </CardHeader>

      <CardBody className="py-4">
        <div className="space-y-4">
          {/* Race Information */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-foreground-600">
              <CalendarIcon className="w-4 h-4" />
              <span>{new Date(plan.race_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1 text-foreground-600">
              <MapPinIcon className="w-4 h-4" />
              <span>{plan.distance}</span>
            </div>
          </div>

          {/* Current Phase */}
          {plan.current_phase && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground-600">Current Phase:</span>
              <Chip
                color={getPhaseColor(plan.current_phase)}
                size="sm"
                variant="dot"
                className="capitalize"
              >
                {plan.current_phase}
              </Chip>
            </div>
          )}

          {/* Progress */}
          {plan.progress !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground-600">Progress</span>
                <span className="font-medium">{plan.progress}% Complete</span>
              </div>
              <Progress
                value={plan.progress}
                color="primary"
                className="h-2"
                classNames={{
                  indicator: "bg-linear-to-r from-primary to-secondary"
                }}
              />
            </div>
          )}

          {/* Goal Information */}
          {plan.goal_type && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-600">Goal:</span>
              <span className="font-medium capitalize">{plan.goal_type}</span>
            </div>
          )}
        </div>
      </CardBody>

      <CardFooter className="pt-4">
        <div className="flex justify-between items-center w-full">
          <Button
            color="primary"
            variant="flat"
            size="sm"
            className="font-medium"
          >
            View Details
          </Button>
          <div className="text-xs text-foreground-500">
            {plan.weeks_remaining ? `${plan.weeks_remaining} weeks left` : 'Completed'}
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
```

### 3. Dashboard Component Migration

**Current: `src/components/dashboard/CoachDashboard.tsx`**

```typescript
// BEFORE - Standard HTML/Tailwind
return (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3>Active Runners</h3>
      <p className="text-2xl font-bold">{stats.activeRunners}</p>
    </div>
  </div>
)
```

**After: Mountain Peak Hybrid with HeroUI**

```typescript
'use client'

import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Progress,
  Chip
} from '@heroui/react'
import {
  UsersIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  TrendingUpIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
  }
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
}

function MetricCard({ title, value, subtitle, icon: Icon, trend, color = 'primary' }: MetricCardProps) {
  const getTrendColor = () => {
    switch (trend?.direction) {
      case 'up': return 'success'
      case 'down': return 'danger'
      default: return 'default'
    }
  }

  const TrendIcon = trend?.direction === 'up' ? ArrowUpIcon :
                   trend?.direction === 'down' ? ArrowDownIcon : null

  return (
    <Card className="border-t-4 border-t-primary/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <CardBody className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground-600 uppercase tracking-wider">
              {title}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-foreground">
                {value}
              </span>
              {subtitle && (
                <span className="text-lg text-foreground-500">{subtitle}</span>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-lg bg-${color}/10`}>
            <Icon className={`w-6 h-6 text-${color}`} />
          </div>
        </div>

        {trend && (
          <div className="flex items-center gap-1">
            {TrendIcon && (
              <TrendIcon className={`w-4 h-4 text-${getTrendColor()}`} />
            )}
            <span className={`text-sm font-medium text-${getTrendColor()}`}>
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="text-sm text-foreground-500">from last week</span>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export default function CoachDashboard() {
  // Your existing dashboard logic...

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Summit Dashboard
          </h1>
          <p className="text-foreground-600">
            Track your athletes' ascent to peak performance
          </p>
        </div>

        <Card className="bg-linear-to-br from-warning/10 to-warning/5 border border-warning/20 p-4">
          <div className="text-center">
            <p className="text-xs text-warning font-medium mb-1">NEXT BIG RACE</p>
            <p className="font-bold text-foreground">Western States 100</p>
            <p className="text-sm text-foreground-600">42 days remaining</p>
          </div>
        </Card>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Athletes"
          value={stats.activeRunners}
          subtitle="runners"
          icon={UsersIcon}
          trend={{ value: 12, direction: 'up' }}
          color="primary"
        />

        <MetricCard
          title="This Week"
          value={stats.weeklyVolume}
          subtitle="km total"
          icon={ChartBarIcon}
          trend={{ value: 8, direction: 'up' }}
          color="secondary"
        />

        <MetricCard
          title="Completion Rate"
          value={stats.completionRate}
          subtitle="% workouts"
          icon={TrendingUpIcon}
          trend={{ value: -3, direction: 'down' }}
          color="success"
        />

        <MetricCard
          title="Upcoming Races"
          value={stats.upcomingRaces}
          subtitle="events"
          icon={CalendarDaysIcon}
          color="warning"
        />
      </div>

      {/* Rest of dashboard content... */}
    </div>
  )
}
```

### 4. Modal Components Migration

**Before: Standard modal implementation**

```typescript
// Basic modal structure
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
  <div className="bg-white rounded-lg p-6 max-w-md w-full">
    <h2>Create Training Plan</h2>
    <form>
      <input type="text" placeholder="Plan title" />
      <button type="submit">Create</button>
    </form>
  </div>
</div>
```

**After: HeroUI Modal with Mountain Peak styling**

```typescript
'use client'

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Textarea,
  DatePicker
} from '@heroui/react'
import { useState } from 'react'

interface CreateTrainingPlanModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateTrainingPlanModal({ isOpen, onClose, onSuccess }: CreateTrainingPlanModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    raceId: '',
    goalType: '',
    description: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Your form submission logic...
    onSuccess()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      classNames={{
        backdrop: "bg-black/50 backdrop-blur-xs",
        wrapper: "flex items-center justify-center",
        base: "border border-default-200",
        header: "border-b border-default-200",
        footer: "border-t border-default-200",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-foreground">Create Training Plan</h2>
          <p className="text-sm text-foreground-600">Design a new path to peak performance</p>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <ModalBody className="space-y-4">
            <Input
              label="Plan Title"
              placeholder="e.g., Western States 100 Preparation"
              value={formData.title}
              onValueChange={(value) => setFormData(prev => ({ ...prev, title: value }))}
              classNames={{
                input: "text-foreground",
                inputWrapper: "border-default-200 hover:border-primary focus-within:border-primary"
              }}
              required
            />

            <Select
              label="Target Race"
              placeholder="Select a race"
              value={formData.raceId}
              onSelectionChange={(value) => setFormData(prev => ({ ...prev, raceId: value as string }))}
              classNames={{
                trigger: "border-default-200 hover:border-primary focus:border-primary"
              }}
            >
              <SelectItem key="western-states" value="western-states">
                Western States 100 - June 24, 2025
              </SelectItem>
              <SelectItem key="leadville" value="leadville">
                Leadville Trail 100 - August 19, 2025
              </SelectItem>
              <SelectItem key="utmb" value="utmb">
                UTMB OCC 50K - August 30, 2025
              </SelectItem>
            </Select>

            <Select
              label="Goal Type"
              placeholder="What's the primary goal?"
              value={formData.goalType}
              onSelectionChange={(value) => setFormData(prev => ({ ...prev, goalType: value as string }))}
              classNames={{
                trigger: "border-default-200 hover:border-primary focus:border-primary"
              }}
            >
              <SelectItem key="completion" value="completion">
                Completion (Finish the race)
              </SelectItem>
              <SelectItem key="time" value="time">
                Time Goal (Specific finish time)
              </SelectItem>
              <SelectItem key="placement" value="placement">
                Placement (Top 10, age group, etc.)
              </SelectItem>
            </Select>

            <Textarea
              label="Description"
              placeholder="Additional notes or specific requirements..."
              value={formData.description}
              onValueChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
              classNames={{
                input: "text-foreground",
                inputWrapper: "border-default-200 hover:border-primary focus-within:border-primary"
              }}
              minRows={3}
            />
          </ModalBody>

          <ModalFooter>
            <Button
              variant="light"
              onPress={onClose}
              className="hover:bg-default-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              color="primary"
              className="bg-linear-to-r from-primary to-secondary text-white font-medium"
            >
              Create Plan
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
```

---

## 🎨 Custom Component Styles

### Mountain Peak Enhancement Classes

**File: `src/styles/components.css`**

```css
@layer components {
  /* Training Zone Indicators */
  .zone-indicator {
    @apply inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide;
  }

  .zone-1 {
    @apply bg-success/10 text-success border border-success/20;
  }

  .zone-2 {
    @apply bg-primary/10 text-primary border border-primary/20;
  }

  .zone-3 {
    @apply bg-warning/10 text-warning border border-warning/20;
  }

  .zone-4 {
    @apply bg-danger/10 text-danger border border-danger/20;
  }

  .zone-5 {
    @apply bg-secondary/10 text-secondary border border-secondary/20;
  }

  /* Enhanced Progress Bars */
  .progress-mountain {
    @apply relative overflow-hidden;
  }

  .progress-mountain::after {
    content: '';
    @apply absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent;
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  /* Metric Cards with Mountain styling */
  .metric-card-enhanced {
    @apply bg-background border border-divider rounded-xl p-6 relative overflow-hidden;
    @apply hover:shadow-lg hover:-translate-y-1 transition-all duration-300;
  }

  .metric-card-enhanced::before {
    content: '';
    @apply absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary to-secondary;
  }

  .metric-card-enhanced.primary::before {
    @apply bg-primary;
  }

  .metric-card-enhanced.secondary::before {
    @apply bg-secondary;
  }

  .metric-card-enhanced.success::before {
    @apply bg-success;
  }

  .metric-card-enhanced.warning::before {
    @apply bg-warning;
  }
}
```

---

## 🚀 Migration Checklist

### Phase 1: Foundation ✅

- [ ] Update `tailwind.config.js` with Mountain Peak colors
- [ ] Add custom CSS variables and component classes
- [ ] Test theme switching functionality
- [ ] Verify HeroUI component imports

### Phase 2: Core Components

- [ ] Migrate Header component with sticky nav and branding
- [ ] Update TrainingPlanCard with enhanced styling
- [ ] Convert modal components to HeroUI Modal
- [ ] Implement theme toggle with proper state management

### Phase 3: Dashboard & Data

- [ ] Migrate CoachDashboard with metric cards
- [ ] Update RunnerDashboard with consistent styling
- [ ] Add training zone indicators throughout
- [ ] Implement progress animations

### Phase 4: Forms & Interactions

- [ ] Convert all form inputs to HeroUI components
- [ ] Add proper validation and error states
- [ ] Implement loading states with skeleton screens
- [ ] Test keyboard navigation and accessibility

### Phase 5: Polish & Testing

- [ ] Verify responsive design on all screen sizes
- [ ] Test dark/light mode transitions
- [ ] Audit accessibility compliance (WCAG AA)
- [ ] Performance testing and optimization

---

## 🐛 Common Migration Issues & Solutions

### 1. Theme Color Not Applied

**Problem**: Custom colors not showing up in HeroUI components
**Solution**: Ensure colors are properly defined in both Tailwind config and CSS variables

```javascript
// In tailwind.config.js - must be in the heroui theme object
heroui({
  themes: {
    light: {
      colors: {
        primary: '#0284c7', // Must be here, not in extend.colors
      },
    },
  },
})
```

### 2. Component Styling Conflicts

**Problem**: Custom styles not overriding HeroUI defaults
**Solution**: Use HeroUI's `classNames` prop for component-specific styling

```typescript
<Card classNames={{
  base: "border-t-4 border-t-primary hover:shadow-lg",
  header: "pb-2",
  body: "py-4"
}}>
```

### 3. Dark Mode Toggle Issues

**Problem**: Theme state not persisting or updating properly
**Solution**: Ensure theme atom is properly connected to DOM class

```typescript
// In your theme wrapper component
useEffect(() => {
  document.documentElement.classList.toggle('dark', themeMode === 'dark')
}, [themeMode])
```

### 4. Mobile Responsiveness

**Problem**: Components not responsive on mobile devices
**Solution**: Use HeroUI's responsive props and test thoroughly

```typescript
<Card className="w-full md:max-w-md lg:max-w-lg">
<Button size="sm" className="md:size-md">
```

---

## 📈 Success Validation

### Visual Verification

- [ ] Mountain Peak colors visible throughout interface
- [ ] Smooth theme transitions between light and dark modes
- [ ] Training zone colors properly applied to relevant components
- [ ] Consistent spacing and typography across all components

### Functionality Testing

- [ ] All interactive elements respond properly
- [ ] Forms submit correctly with validation
- [ ] Navigation works across all pages
- [ ] Modal components open/close properly

### Performance Validation

- [ ] No layout shifts during theme transitions
- [ ] Hover animations smooth and performant
- [ ] Page load times remain fast
- [ ] Bundle size increase minimal (<10KB)

### Accessibility Compliance

- [ ] All components keyboard navigable
- [ ] Color contrast ratios meet WCAG AA standards
- [ ] Screen reader compatibility maintained
- [ ] Focus indicators clearly visible

---

_This migration guide ensures a smooth transition to the Mountain Peak Hybrid design while maintaining all existing functionality and improving the overall user experience._
