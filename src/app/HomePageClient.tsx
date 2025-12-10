'use client'

import { Button, Card, CardBody, Chip } from '@heroui/react'
import {
  ArrowRightIcon,
  MessageCircleIcon,
  MountainSnowIcon,
  TrendingUpIcon,
  UsersIcon,
} from 'lucide-react'

import Link from 'next/link'

import Layout from '@/components/layout/Layout'

export default function HomePageClient() {
  return (
    <Layout>
      {/* Hero Section with Mountain Peak Enhanced styling */}
      <div className="relative overflow-hidden bg-linear-to-br from-primary-600 via-primary-700 to-secondary-600">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center text-white">
            <Chip
              variant="flat"
              color="warning"
              size="lg"
              className="mb-6 bg-warning-100/20 text-warning-100"
              startContent={<MountainSnowIcon className="w-4 h-4" />}
            >
              🏔️ Professional Alpine Training Platform
            </Chip>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-linear-to-r from-white to-warning-200 bg-clip-text text-transparent">
              Conquer Your Peaks
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-4xl mx-auto text-primary-100">
              Master ultramarathon excellence with expert coaching, scientific training methods, and
              the tools to reach every summit on your journey.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md mx-auto sm:max-w-none">
              <Button
                as={Link}
                href="/auth/signup"
                size="lg"
                color="warning"
                variant="solid"
                className="w-full sm:w-auto min-h-[48px] text-primary-900 font-semibold"
                endContent={<ArrowRightIcon className="w-4 h-4" />}
              >
                Begin Your Ascent
              </Button>
              <Button
                as={Link}
                href="/coaches"
                size="lg"
                variant="bordered"
                className="w-full sm:w-auto min-h-[48px] border-white text-white hover:bg-white hover:text-primary-700 font-semibold"
                startContent={<UsersIcon className="w-4 h-4" />}
              >
                Find Your Guide
              </Button>
            </div>
          </div>
        </div>
        {/* Mountain silhouette decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-default-50 to-transparent" />
      </div>

      {/* Features Section */}
      <div className="py-20 bg-default-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Chip variant="flat" color="primary" size="lg" className="mb-4">
              Why Alpine Coaching Works
            </Chip>
            <h2 className="text-4xl md:text-5xl font-bold text-default-900 mb-6">
              🏔️ Base Camp to Summit
            </h2>
            <p className="text-xl text-default-600 max-w-3xl mx-auto">
              Every expedition requires the right preparation, guidance, and support system. Our
              platform provides everything you need for ultramarathon success.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardBody className="text-center p-8">
                <div className="bg-linear-to-br from-success-100 to-success-200 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <UsersIcon className="w-10 h-10 text-success-700" />
                </div>
                <h3 className="text-2xl font-bold text-default-900 mb-4">
                  🎯 Expert Sherpa Guidance
                </h3>
                <p className="text-default-600 leading-relaxed">
                  Connect with certified ultramarathon coaches who&apos;ve conquered the peaks
                  you&apos;re climbing. Get personalized guidance for every step of your expedition.
                </p>
                <Chip variant="flat" color="success" size="sm" className="mt-4">
                  Professional Coaching
                </Chip>
              </CardBody>
            </Card>

            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardBody className="text-center p-8">
                <div className="bg-linear-to-br from-primary-100 to-primary-200 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUpIcon className="w-10 h-10 text-primary-700" />
                </div>
                <h3 className="text-2xl font-bold text-default-900 mb-4">
                  📈 Scientific Training Zones
                </h3>
                <p className="text-default-600 leading-relaxed">
                  Track every ascent with precision. Advanced workout logging, training zone
                  analysis, and performance metrics to optimize your mountaineering fitness.
                </p>
                <Chip variant="flat" color="primary" size="sm" className="mt-4">
                  Data-Driven Training
                </Chip>
              </CardBody>
            </Card>

            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardBody className="text-center p-8">
                <div className="bg-linear-to-br from-warning-100 to-warning-200 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircleIcon className="w-10 h-10 text-warning-700" />
                </div>
                <h3 className="text-2xl font-bold text-default-900 mb-4">
                  💬 Base Camp Communication
                </h3>
                <p className="text-default-600 leading-relaxed">
                  Stay connected with your coaching team through real-time messaging. Get immediate
                  support and guidance when conditions change.
                </p>
                <Chip variant="flat" color="warning" size="sm" className="mt-4">
                  Real-Time Support
                </Chip>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="py-20 bg-linear-to-r from-primary-600 to-secondary-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <MountainSnowIcon className="w-16 h-16 text-warning-300 mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready for Your Next Summit?
          </h2>
          <p className="text-xl text-primary-100 mb-10 max-w-3xl mx-auto leading-relaxed">
            Join the expedition of ultramarathon athletes who are already conquering their peaks
            with professional coaching, scientific training, and unwavering support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md mx-auto sm:max-w-none">
            <Button
              as={Link}
              href="/auth/signup"
              size="lg"
              color="warning"
              variant="solid"
              className="w-full sm:w-auto min-h-[48px] text-primary-900 font-bold text-lg px-8"
              endContent={<ArrowRightIcon className="w-5 h-5" />}
            >
              Start Your Expedition Today
            </Button>
            <Button
              as={Link}
              href="/auth/signin"
              size="lg"
              variant="bordered"
              className="w-full sm:w-auto min-h-[48px] border-white text-white hover:bg-white hover:text-primary-700 font-semibold"
            >
              Return to Base Camp
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
