'use client'

import type { ChipProps } from '@heroui/react'
import { Chip, Tooltip } from '@heroui/react'
import { Clock, Sparkles, Wrench, Zap } from 'lucide-react'

import type { ReactNode } from 'react'

export type BadgeVariant = 'coming-soon' | 'beta' | 'in-development' | 'launching-soon'

interface ComingSoonBadgeProps {
  /** The variant determines the badge text and styling */
  variant?: BadgeVariant
  /** Optional tooltip text for additional context */
  tooltip?: string
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg'
  /** Optional custom className */
  className?: string
  /**
   * Additional props to pass to the underlying Chip component.
   * Useful for adding onClick, data-* attributes, radius, etc.
   * Component-controlled props (variant, color, size, startContent) take precedence.
   */
  chipProps?: Partial<Omit<ChipProps, 'variant' | 'color' | 'size' | 'startContent' | 'children'>>
}

const variantConfig: Record<
  BadgeVariant,
  {
    label: string
    color: 'warning' | 'secondary' | 'primary' | 'success'
    icon: ReactNode
    defaultTooltip: string
  }
> = {
  'coming-soon': {
    label: 'Coming Soon',
    color: 'warning',
    icon: <Clock className="w-3 h-3" />,
    defaultTooltip: 'This feature is coming soon! Stay tuned for updates.',
  },
  beta: {
    label: 'Beta',
    color: 'secondary',
    icon: <Sparkles className="w-3 h-3" />,
    defaultTooltip: 'This feature is in beta. Some functionality may change.',
  },
  'in-development': {
    label: 'In Development',
    color: 'primary',
    icon: <Wrench className="w-3 h-3" />,
    defaultTooltip: 'This feature is actively being developed.',
  },
  'launching-soon': {
    label: 'Launching Soon',
    color: 'success',
    icon: <Zap className="w-3 h-3" />,
    defaultTooltip: 'This feature is almost ready and will launch soon!',
  },
}

/**
 * ComingSoonBadge - A reusable badge component for marking features as upcoming
 *
 * Variants:
 * - "coming-soon": Default yellow/warning badge for planned features
 * - "beta": Purple/secondary badge for features in testing
 * - "in-development": Blue/primary badge for features actively being built
 * - "launching-soon": Green/success badge for features about to launch
 */
export function ComingSoonBadge({
  variant = 'coming-soon',
  tooltip,
  size = 'sm',
  className = '',
  chipProps,
}: ComingSoonBadgeProps) {
  const config = variantConfig[variant]
  const tooltipText = tooltip || config.defaultTooltip

  // Merge external className with internal className
  const mergedClassName = `font-medium ${className} ${chipProps?.className || ''}`.trim()

  const badge = (
    <Chip
      {...chipProps}
      variant="flat"
      color={config.color}
      size={size}
      startContent={config.icon}
      className={mergedClassName}
    >
      {config.label}
    </Chip>
  )

  return (
    <Tooltip content={tooltipText} placement="top" showArrow>
      {badge}
    </Tooltip>
  )
}

/**
 * ComingSoonOverlay - An overlay version for marking entire sections as coming soon
 *
 * @note When `blur` is true, the content is made non-interactive for both mouse
 * and keyboard/assistive technology users via `aria-hidden` and `inert` attributes.
 * This is intended for decorative/preview content that should not be interacted with.
 */
interface ComingSoonOverlayProps {
  children: ReactNode
  variant?: BadgeVariant
  message?: string
  /**
   * Whether to blur the underlying content.
   * When true, content becomes non-interactive (pointer-events disabled,
   * aria-hidden for screen readers, inert for keyboard navigation).
   * Use only for decorative/preview content that should not be accessible.
   */
  blur?: boolean
}

export function ComingSoonOverlay({
  children,
  variant = 'coming-soon',
  message,
  blur = false,
}: ComingSoonOverlayProps) {
  return (
    <div className="relative">
      <div
        className={blur ? 'opacity-60 pointer-events-none select-none filter blur-[1px]' : ''}
        aria-hidden={blur || undefined}
        // @ts-expect-error - inert is a valid HTML attribute but not yet in React types
        inert={blur ? '' : undefined}
        tabIndex={blur ? -1 : undefined}
      >
        {children}
      </div>
      <div className="absolute top-2 right-2 z-10">
        <ComingSoonBadge variant={variant} tooltip={message} />
      </div>
    </div>
  )
}

export default ComingSoonBadge
