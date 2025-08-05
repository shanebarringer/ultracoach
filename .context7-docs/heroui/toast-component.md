# HeroUI Toast Component Documentation

**Source**: Context7 MCP - HeroUI Library  
**Last Updated**: 2025-08-05  
**Library ID**: /heroui-inc/heroui

## Overview

HeroUI provides a native Toast component system that's perfectly integrated with the HeroUI design system. This is the recommended approach for toast notifications in HeroUI applications.

## Installation

```bash
npx heroui-cli@latest add toast
# or
npm install @heroui/toast
# or
yarn add @heroui/toast
# or
pnpm add @heroui/toast
# or
bun add @heroui/toast
```

## Basic Setup

### 1. ToastProvider Setup

```tsx
// app/providers.tsx
import { HeroUIProvider } from '@heroui/react'
import { ToastProvider } from '@heroui/toast'

export default function Providers({ children }) {
  return (
    <HeroUIProvider>
      <ToastProvider />
      {children}
    </HeroUIProvider>
  )
}
```

### 2. Import Toast Functions

```tsx
import {addToast, ToastProvider} from "@heroui/react";
// or
import {addToast, ToastProvider} from "@heroui/toast";
```

## Basic Usage

### Simple Toast

```tsx
import { addToast } from '@heroui/react'

// Simple message
addToast('Action completed successfully!')

// With title and description
addToast({
  title: 'Success!',
  description: 'Your changes have been saved.',
})
```

### Toast with Custom Icon

```tsx
addToast({
  title: 'Loading',
  description: 'Please wait while data is fetched.',
  icon: 'spinner',
})
```

## Color Variants

```tsx
addToast({
  title: 'Primary Toast',
  description: 'This is a primary notification.',
  color: 'primary',
})

addToast({
  title: 'Success Toast',
  description: 'This is a success notification.',
  color: 'success',
})

addToast({
  title: 'Warning Toast',
  description: 'This is a warning notification.',
  color: 'warning',
})

addToast({
  title: 'Error Toast',
  description: 'This is an error notification.',
  color: 'danger',
})
```

## Visual Variants

```tsx
addToast({
  title: 'Flat Toast',
  description: 'A simple flat toast.',
  variant: 'flat',
})

addToast({
  title: 'Outline Toast',
  description: 'A toast with an outline border.',
  variant: 'outline',
})

addToast({
  title: 'Solid Toast',
  description: 'A toast with solid background.',
  variant: 'solid',
})
```

## Placement Options

```tsx
addToast({
  title: 'Top Center Toast',
  description: 'This toast appears at the top center.',
  placement: 'top',
})

addToast({
  title: 'Bottom Right Toast',
  description: 'This toast appears at the bottom right.',
  placement: 'bottom-end',
})

addToast({
  title: 'Top Left Toast',
  description: 'This toast appears at the top left.',
  placement: 'top-start',
})
```

## Programmatic Control

### Closing Toasts

```tsx
import { addToast, removeToast } from '@heroui/react'

// Add a toast and get its ID
const toastId = addToast({
  title: 'Auto-closing Toast',
  description: 'This toast will close automatically.',
  timeout: 3000, // 3 seconds
})

// To manually close a toast using its ID
// removeToast(toastId);

// To close all toasts
// removeAllToasts();
```

### Promise-based Toasts

```tsx
addToast({
  title: 'Loading...',
  description: 'Processing your request',
  promise: fetchData(),
})
```

## Advanced Configuration

### Global Toast Configuration

```tsx
<ToastProvider
  maxVisibleToasts={3}
  placement="bottom-right"
  disableAnimation={false}
  toastOffset={0}
  toastProps={{
    radius: 'full',
    color: 'primary',
    variant: 'flat',
    timeout: 1000,
    hideIcon: true,
    classNames: {
      closeButton: 'opacity-100 absolute right-4 top-1/2 -translate-y-1/2',
    },
  }}
/>
```

### Custom Styling

```tsx
addToast({
  title: 'Custom Styled Toast',
  description: 'This toast has custom styling.',
  classNames: {
    base: 'bg-gradient-to-r from-purple-400 to-blue-500 text-white',
    title: 'font-bold',
    description: 'text-sm',
  },
})
```

### Custom Close Icon

```tsx
addToast({
  title: 'Custom Close Icon',
  description: 'Toast with a custom close icon.',
  closeIcon: 'x', // Or a custom component/SVG
  classNames: {
    closeButton: 'text-red-500 hover:text-red-700',
  },
})
```

## API Reference

### addToast Function

```typescript
addToast(message: string, options?: ToastOptions): string
addToast(options: ToastOptions): string
```

**Returns**: A unique string key identifying the newly created toast.

### ToastOptions

```typescript
interface ToastOptions {
  title?: ReactNode
  icon?: ReactNode
  description?: ReactNode
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  variant?: 'solid' | 'bordered' | 'flat'
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  endContent?: ReactNode
  closeIcon?: ReactNode
  timeout?: number
  promise?: Promise | undefined
  loadingComponent?: ReactNode
  hideIcon?: boolean
  hideCloseButton?: boolean
  shouldShowTimeoutProgress?: boolean
  severity?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  classNames?: Partial<Record<ToastSlots, string>>
}
```

### ToastProvider Props

```typescript
interface ToastProviderProps {
  maxVisibleToasts?: number // Default: 3
  placement?:
    | 'bottom-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'top-right'
    | 'top-left'
    | 'top-center' // Default: "bottom-right"
  disableAnimation?: boolean // Default: false
  toastOffset?: number // Default: 0
  toastProps?: ToastOptions
  regionProps?: ToastRegionProps
}
```

## Events

### Toast Events

```typescript
onClose: () => void
// Handler called when the close button is clicked
```

## Accessibility

- Toasts have an `alert` role
- Close button has `aria-label="Close"` by default
- `ToastRegion` is removed from DOM when no toasts are present
- Fully keyboard accessible

## Best Practices

1. **Use HeroUI's native toast system** instead of third-party libraries like sonner for better integration
2. **Limit visible toasts** using `maxVisibleToasts` to avoid overwhelming users
3. **Use appropriate colors** - `success` for confirmations, `danger` for errors, `warning` for cautions
4. **Keep messages concise** - Use title for the main message, description for additional context
5. **Set appropriate timeouts** - Longer for errors (6s), shorter for success (4s)
6. **Don't overuse toasts** - Consider other feedback methods for less critical information

## UltraCoach Implementation

For UltraCoach, we've created a convenient wrapper:

```tsx
// src/lib/toast.ts
import { addToast } from '@heroui/react'

export const toast = {
  success: (title: string, description?: string) =>
    addToast({ title, description, color: 'success', timeout: 4000 }),

  error: (title: string, description?: string) =>
    addToast({ title, description, color: 'danger', timeout: 6000 }),

  // ... other methods
}

export const commonToasts = {
  loginSuccess: () => toast.success('Welcome back!', 'Successfully signed in'),
  profileSaved: () => toast.success('Profile updated', 'Your changes have been saved'),
  // ... other common toasts
}
```
