'use client'

/**
 * TourCard - Custom card component for NextStep.js product tours
 *
 * Follows the Mountain Peak design system with alpine gradients
 * and HeroUI component integration for consistent styling.
 */
import { Button, Card, CardBody, CardFooter, CardHeader, Progress } from '@heroui/react'
import { ChevronLeft, ChevronRight, Mountain, X } from 'lucide-react'

import React from 'react'

import type { Step } from 'nextstepjs'

interface TourCardProps {
  step: Step
  currentStep: number
  totalSteps: number
  nextStep: () => void
  prevStep: () => void
  skipTour?: () => void
  arrow: React.ReactNode
}

export default function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
  arrow,
}: TourCardProps) {
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === totalSteps - 1
  const progressPercent = ((currentStep + 1) / totalSteps) * 100

  return (
    <Card className="relative z-50 w-[90vw] sm:w-[380px] max-w-[calc(100vw-32px)] max-h-[80vh] overflow-y-auto shadow-xl border border-alpine-200 dark:border-alpine-700 bg-background/95 backdrop-blur-sm">
      {/* Header with gradient accent */}
      <CardHeader className="relative z-10 flex flex-col gap-2 pb-2">
        {/* Top bar with skip button */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-alpine-600 dark:text-alpine-400">
            <Mountain className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Step {currentStep + 1} of {totalSteps}
            </span>
          </div>

          {/* Clear boolean logic: show skip if step.showSkip is true or undefined */}
          {(step.showSkip ?? true) && skipTour && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={skipTour}
              aria-label="Skip tour"
              className="text-default-400 hover:text-default-600"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Progress bar with enhanced visibility (8px minimum height) */}
        <Progress
          size="md"
          value={progressPercent}
          color="primary"
          className="w-full h-2"
          aria-label="Tour progress"
        />

        {/* Title with icon */}
        <div className="flex items-center gap-3 pt-2">
          {step.icon && <span className="text-2xl">{step.icon}</span>}
          <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
        </div>
      </CardHeader>

      <CardBody className="relative z-10 py-3 px-4">
        {/* Content */}
        <div className="text-sm text-foreground/80 dark:text-foreground/70 leading-relaxed">
          {step.content}
        </div>

        {/* Arrow indicator */}
        <div className="mt-2">{arrow}</div>
      </CardBody>

      <CardFooter className="relative z-10 flex justify-between items-center pt-2 border-t border-alpine-100 dark:border-alpine-800">
        {/* Navigation buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="flat"
            onPress={prevStep}
            isDisabled={isFirstStep}
            startContent={<ChevronLeft className="w-4 h-4" />}
            className="bg-alpine-50 dark:bg-alpine-900/30 text-alpine-700 dark:text-alpine-300"
          >
            Back
          </Button>
        </div>

        <Button
          size="sm"
          color="primary"
          onPress={nextStep}
          endContent={!isLastStep && <ChevronRight className="w-4 h-4" />}
        >
          {isLastStep ? 'Complete Tour' : 'Next'}
        </Button>
      </CardFooter>
    </Card>
  )
}
