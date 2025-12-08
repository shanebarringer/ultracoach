import { Card, CardBody, Chip, Tooltip } from '@heroui/react'
import { Check, Clock, Sparkles } from 'lucide-react'

import type { Metadata } from 'next'
import Link from 'next/link'

import Layout from '@/components/layout/Layout'

export const metadata: Metadata = {
  title: 'Pricing - UltraCoach',
  description:
    'Choose the UltraCoach plan that works for you. Free for runners, affordable for coaches.',
}

export default function PricingPage() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <Chip variant="flat" color="primary" size="lg" className="mb-4">
            Simple, Transparent Pricing
          </Chip>
          <h1 className="text-4xl md:text-5xl font-bold text-default-900 mb-6">
            Choose Your Path to the Summit
          </h1>
          <p className="text-xl text-default-600 max-w-2xl mx-auto">
            UltraCoach is free for runners and affordably priced for coaches. No hidden fees, no
            long-term contracts.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Runner Plan */}
          <Card className="border-2 border-primary-200 shadow-lg">
            <CardBody className="p-8">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-default-800 mb-2">For Runners</h2>
                <div className="text-5xl font-bold text-primary-600 mb-4">Free</div>
                <p className="text-default-600 mb-6">
                  Everything you need to train with your coach
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-default-600">
                  <Check className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
                  Access to all training plans
                </li>
                <li className="flex items-center text-default-600">
                  <Check className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
                  Workout logging and tracking
                </li>
                <li className="flex items-center text-default-600">
                  <Check className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
                  Real-time coach messaging
                </li>
                <li className="flex items-center text-default-600">
                  <Check className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
                  Progress analytics
                </li>
                <li className="flex items-center text-default-600">
                  <Check className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
                  Calendar integration
                </li>
                <li className="flex items-center text-default-600">
                  <Check className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
                  Strava sync
                </li>
              </ul>

              <div className="text-center">
                <Link
                  href="/auth/signup"
                  className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors w-full text-center"
                >
                  Get Started Free
                </Link>
              </div>
            </CardBody>
          </Card>

          {/* Coach Plan */}
          <Card className="border-2 border-success-200 shadow-lg relative overflow-visible">
            {/* Coming Soon Badge */}
            <div className="absolute -top-3 right-4 z-10">
              <Tooltip
                content="Paid plans are coming soon! Coaches currently enjoy free access during our beta period."
                placement="top"
                showArrow
              >
                <Chip
                  variant="flat"
                  color="warning"
                  size="sm"
                  startContent={<Clock className="w-3 h-3" />}
                  className="font-medium shadow-md"
                >
                  Coming Soon
                </Chip>
              </Tooltip>
            </div>

            <CardBody className="p-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h2 className="text-2xl font-semibold text-default-800">For Coaches</h2>
                </div>
                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <span className="text-5xl font-bold text-success-600">$29</span>
                </div>
                <div className="text-default-500 mb-2">per month</div>
                <Chip
                  variant="flat"
                  color="secondary"
                  size="sm"
                  startContent={<Sparkles className="w-3 h-3" />}
                  className="mb-4"
                >
                  Free During Beta
                </Chip>
                <p className="text-default-600 mb-6">
                  Professional coaching tools and unlimited athletes
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-default-600">
                  <Check className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
                  Everything in Runner plan
                </li>
                <li className="flex items-center text-default-600">
                  <Check className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
                  Unlimited athlete management
                </li>
                <li className="flex items-center text-default-600">
                  <Check className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
                  Advanced training plan templates
                </li>
                <li className="flex items-center text-default-600">
                  <Check className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
                  Athlete progress monitoring
                </li>
                <li className="flex items-center text-default-600">
                  <Check className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
                  Professional dashboard
                </li>
                <li className="flex items-center text-default-600">
                  <Check className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
                  Priority support
                </li>
              </ul>

              <div className="text-center">
                <Link
                  href="/auth/signup"
                  className="inline-block bg-success-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-success-700 transition-colors w-full text-center"
                >
                  Start Coaching Free
                </Link>
                <p className="text-xs text-default-500 mt-2">No credit card required during beta</p>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Future Features Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <Card className="bg-default-50 border border-default-200">
            <CardBody className="p-8">
              <div className="text-center mb-6">
                <Chip
                  variant="flat"
                  color="warning"
                  size="md"
                  startContent={<Clock className="w-4 h-4" />}
                  className="mb-4"
                >
                  On the Roadmap
                </Chip>
                <h3 className="text-2xl font-bold text-default-900">Features Coming Soon</h3>
                <p className="text-default-600 mt-2">
                  We&apos;re constantly improving UltraCoach. Here&apos;s what&apos;s next:
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-start gap-3 p-4 bg-default-100 rounded-lg">
                  <Clock className="w-5 h-5 text-warning-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-default-800">AI Coaching Insights</p>
                    <p className="text-sm text-default-500">Smart training recommendations</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-default-100 rounded-lg">
                  <Clock className="w-5 h-5 text-warning-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-default-800">Community Features</p>
                    <p className="text-sm text-default-500">Connect with other athletes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-default-100 rounded-lg">
                  <Clock className="w-5 h-5 text-warning-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-default-800">Advanced Analytics</p>
                    <p className="text-sm text-default-500">Deep performance insights</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-default-100 rounded-lg">
                  <Clock className="w-5 h-5 text-warning-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-default-800">Garmin Integration</p>
                    <p className="text-sm text-default-500">Sync your Garmin data</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-default-100 rounded-lg">
                  <Clock className="w-5 h-5 text-warning-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-default-800">Mobile App</p>
                    <p className="text-sm text-default-500">iOS and Android apps</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-default-100 rounded-lg">
                  <Clock className="w-5 h-5 text-warning-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-default-800">Race Predictions</p>
                    <p className="text-sm text-default-500">AI-powered finish time estimates</p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <p className="text-default-600">
            Questions about pricing?{' '}
            <Link href="/contact" className="text-primary-600 hover:underline">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  )
}
