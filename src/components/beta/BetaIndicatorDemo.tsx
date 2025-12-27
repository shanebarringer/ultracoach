'use client'

import { Card, CardBody, CardHeader } from '@heroui/react'

import BetaIndicator from './BetaIndicator'

/**
 * BetaIndicatorDemo - Visual demonstration of BetaIndicator variants
 *
 * This component shows different usage examples of the BetaIndicator.
 * Use this for development/testing or as a reference for implementation.
 *
 * @example
 * // Add to your dashboard to preview:
 * import { BetaIndicatorDemo } from '@/components/beta/BetaIndicatorDemo'
 *
 * <BetaIndicatorDemo />
 */
export function BetaIndicatorDemo() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold">Beta Indicator Variants</h3>
          <p className="text-sm text-foreground-600">Hover over each badge to see the tooltip</p>
        </div>
      </CardHeader>
      <CardBody className="space-y-6">
        {/* Size variants */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground-700">Size Variants</h4>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-600">Small:</span>
              <BetaIndicator size="sm" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-600">Medium:</span>
              <BetaIndicator size="md" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-600">Large:</span>
              <BetaIndicator size="lg" />
            </div>
          </div>
        </div>

        {/* Icon variants */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground-700">Icon Variants</h4>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-600">With icon:</span>
              <BetaIndicator showIcon={true} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-600">Without icon:</span>
              <BetaIndicator showIcon={false} />
            </div>
          </div>
        </div>

        {/* Feedback link variants */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground-700">Feedback Options</h4>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-600">With feedback:</span>
              <BetaIndicator showFeedbackLink={true} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-600">No feedback:</span>
              <BetaIndicator showFeedbackLink={false} />
            </div>
          </div>
        </div>

        {/* Custom message */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground-700">Custom Message</h4>
          <BetaIndicator
            tooltip="Special early access for founding coaches! Help us build the best ultramarathon coaching platform."
            feedbackContact="https://forms.ultracoach.app/beta"
          />
        </div>

        {/* Header simulation */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground-700">Header Usage Example</h4>
          <div className="bg-background/95 border border-divider rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">🏔️</span>
              <span className="font-black text-lg">UltraCoach</span>
              <BetaIndicator size="sm" />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export default BetaIndicatorDemo
