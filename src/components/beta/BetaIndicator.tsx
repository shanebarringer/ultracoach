'use client'

import { Chip, Link, Tooltip } from '@heroui/react'
import { Mail, Sparkles } from 'lucide-react'

import { memo } from 'react'

interface BetaIndicatorProps {
  /**
   * Size of the beta badge
   * @default 'sm'
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Custom tooltip message
   * @default "You're part of our beta program! Your feedback helps shape UltraCoach."
   */
  tooltip?: string

  /**
   * Whether to show the feedback link in tooltip
   * @default true
   */
  showFeedbackLink?: boolean

  /**
   * Feedback email or URL
   * @default 'feedback@ultracoach.app'
   */
  feedbackContact?: string

  /**
   * Optional custom className for the chip
   */
  className?: string

  /**
   * Whether to show sparkle icon
   * @default true
   */
  showIcon?: boolean
}

/**
 * BetaIndicator - A badge indicating the user is part of the beta program
 *
 * Features:
 * - Distinctive alpine blue color matching Mountain Peak design
 * - Sparkle icon to make it feel special
 * - Tooltip with beta program information
 * - Optional feedback contact link
 * - Compact design suitable for headers
 *
 * Usage:
 * ```tsx
 * // Basic usage in header
 * <BetaIndicator />
 *
 * // Custom size and message
 * <BetaIndicator
 *   size="md"
 *   tooltip="Thanks for being an early adopter!"
 * />
 *
 * // Without feedback link
 * <BetaIndicator showFeedbackLink={false} />
 * ```
 */
export const BetaIndicator = memo(function BetaIndicator({
  size = 'sm',
  tooltip,
  showFeedbackLink = true,
  feedbackContact = 'feedback@ultracoach.app',
  className = '',
  showIcon = true,
}: BetaIndicatorProps) {
  const defaultTooltip = "You're part of our beta program! Your feedback helps shape UltraCoach."

  const tooltipContent = (
    <div className="max-w-xs space-y-2">
      <p className="text-sm">{tooltip || defaultTooltip}</p>
      {showFeedbackLink && (
        <Link
          href={
            feedbackContact.includes('@')
              ? `mailto:${feedbackContact}?subject=UltraCoach Beta Feedback`
              : feedbackContact
          }
          className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
          isExternal={!feedbackContact.includes('@')}
        >
          <Mail className="w-3 h-3" />
          <span>Send feedback</span>
        </Link>
      )}
    </div>
  )

  const badge = (
    <Chip
      variant="flat"
      color="secondary"
      size={size}
      startContent={showIcon ? <Sparkles className="w-3 h-3" /> : undefined}
      className={`
        font-semibold
        bg-gradient-to-r from-secondary/20 to-primary/20
        border border-secondary/40
        hover:border-secondary/60
        hover:shadow-md
        transition-all duration-200
        ${className}
      `.trim()}
    >
      BETA
    </Chip>
  )

  return (
    <Tooltip content={tooltipContent} placement="bottom" showArrow delay={300}>
      {badge}
    </Tooltip>
  )
})

export default BetaIndicator
