'use client'

import { SparklesIcon } from '@heroicons/react/24/outline'
import { Button, Card, CardBody, Input } from '@heroui/react'

import { memo, useState } from 'react'

import { createLogger } from '@/lib/logger'

const logger = createLogger('BetaBanner')

interface BetaBannerProps {
  className?: string
  showEmailSignup?: boolean
  onEmailSubmit?: (email: string) => void
}

/**
 * BetaBanner Component
 *
 * Displays a promotional banner indicating UltraCoach is free during beta.
 * Features Mountain Peak design system with alpine colors and professional styling.
 *
 * @example
 * ```tsx
 * <BetaBanner showEmailSignup onEmailSubmit={handleEmailSubmit} />
 * ```
 */
const BetaBanner = memo(function BetaBanner({
  className = '',
  showEmailSignup = false,
  onEmailSubmit,
}: BetaBannerProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      logger.warn('Email submission attempted with empty email')
      return
    }

    setIsSubmitting(true)
    logger.info('Beta email submitted', { email })

    try {
      if (onEmailSubmit) {
        await onEmailSubmit(email)
      }
      setEmail('')
      logger.info('Beta email submission successful', { email })
    } catch (error) {
      logger.error('Beta email submission failed', { error, email })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card
      className={`relative overflow-hidden border-none ${className}`}
      style={{
        background:
          'linear-gradient(135deg, var(--alpine-blue-600) 0%, var(--alpine-blue-700) 50%, var(--summit-gold-600) 100%)',
      }}
    >
      {/* Decorative mountain peaks pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l15 30-15 30L15 30z' fill='%23ffffff' fill-opacity='0.2'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
      />

      <CardBody className="relative z-10 py-8 px-6 sm:py-10 sm:px-8 lg:px-12">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Icon and Beta Badge */}
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <div className="bg-summit-gold-400 text-granite-900 px-4 py-1.5 rounded-full font-semibold text-sm uppercase tracking-wider">
              Beta Access
            </div>
          </div>

          {/* Main Heading */}
          <div className="space-y-3 max-w-3xl">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
              Free During Beta
            </h2>
            <p className="text-lg sm:text-xl text-white/90 leading-relaxed">
              Help us build the best ultramarathon coaching platform. Get full access to all
              features at no cost while we perfect the experience.
            </p>
          </div>

          {/* Email Signup or CTA */}
          {showEmailSignup ? (
            <form onSubmit={handleEmailSubmit} className="w-full max-w-md space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  classNames={{
                    input: 'bg-white/95 text-granite-900',
                    inputWrapper:
                      'bg-white/95 backdrop-blur-sm border-none shadow-lg hover:bg-white transition-colors',
                  }}
                  size="lg"
                  aria-label="Email address for beta access"
                />
                <Button
                  type="submit"
                  color="warning"
                  size="lg"
                  className="bg-summit-gold-400 text-granite-900 font-semibold hover:bg-summit-gold-500 shadow-lg min-w-[140px]"
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting || !email.trim()}
                >
                  {isSubmitting ? 'Joining...' : 'Join Beta'}
                </Button>
              </div>
              <p className="text-sm text-white/80">
                No credit card required. Start training smarter today.
              </p>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Button
                as="a"
                href="/auth/signup"
                color="warning"
                size="lg"
                className="bg-summit-gold-400 text-granite-900 font-bold hover:bg-summit-gold-500 shadow-lg px-8 min-w-[200px]"
              >
                Get Started Free
              </Button>
              <Button
                as="a"
                href="/auth/signin"
                variant="bordered"
                size="lg"
                className="border-2 border-white/80 text-white font-semibold hover:bg-white/10 backdrop-blur-sm min-w-[200px]"
              >
                Sign In
              </Button>
            </div>
          )}

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-6 w-full max-w-3xl">
            <div className="flex flex-col items-center space-y-2 bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold text-white">Full Access</div>
              <div className="text-sm text-white/80 text-center">
                All features unlocked during beta
              </div>
            </div>
            <div className="flex flex-col items-center space-y-2 bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold text-white">No Commitment</div>
              <div className="text-sm text-white/80 text-center">Cancel anytime, no strings</div>
            </div>
            <div className="flex flex-col items-center space-y-2 bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold text-white">Shape the Future</div>
              <div className="text-sm text-white/80 text-center">Your feedback matters</div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
})

BetaBanner.displayName = 'BetaBanner'

export default BetaBanner
