import { Card, CardBody, CardHeader, Chip } from '@heroui/react'
import { BarChart3, Calendar, MessageSquare, Mountain, Target, Trophy, Users } from 'lucide-react'

import type { Metadata } from 'next'

import Layout from '@/components/layout/Layout'
import { ComingSoonBadge } from '@/components/ui/ComingSoonBadge'

export const metadata: Metadata = {
  title: 'About UltraCoach',
  description:
    'Learn more about UltraCoach - the premier platform for ultramarathon coaching and training.',
}

export default function AboutPage() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <Card className="mb-8 bg-content1 border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mountain className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">🏔️ About UltraCoach</h1>
                <p className="text-foreground/70 mt-1 text-lg">
                  Summit your potential with professional ultramarathon coaching
                </p>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-lg text-foreground/80">
              The premier platform for ultramarathon coaching and training management, designed to
              guide athletes to their highest peaks.
            </p>
          </CardBody>
        </Card>

        {/* Mission Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="bg-content1">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-secondary" />
                <h2 className="text-2xl font-semibold text-foreground">Our Mission</h2>
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-foreground/80 mb-4">
                UltraCoach empowers coaches and runners to achieve extraordinary ultramarathon goals
                through professional training management, real-time communication, and data-driven
                insights.
              </p>
              <p className="text-foreground/80">
                We understand that ultramarathon training requires careful periodization,
                personalized attention, and seamless coordination between coaches and athletes. Our
                platform provides the tools to make this process efficient, effective, and
                enjoyable.
              </p>
            </CardBody>
          </Card>

          <Card className="bg-content1">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-warning" />
                <h2 className="text-2xl font-semibold text-foreground">Our Vision</h2>
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-foreground/80 mb-4">
                To become the trusted companion for every ultramarathon journey, from the first
                training run to crossing finish lines at the world&apos;s most challenging races.
              </p>
              <p className="text-foreground/80">
                We believe that with proper guidance, structured training, and the right tools,
                every runner can push beyond their perceived limits and achieve their mountain-top
                moments.
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Key Features */}
        <Card className="mb-8 bg-content1">
          <CardHeader>
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">Key Features</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Professional Training Plans
                  </h3>
                  <p className="text-sm text-foreground/70">
                    Race-centric periodization with base, build, peak, and taper phases
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-secondary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Real-Time Communication</h3>
                  <p className="text-sm text-foreground/70">
                    Seamless coach-runner messaging with workout context and progress tracking
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <BarChart3 className="w-5 h-5 text-success flex-shrink-0 mt-1" />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">Advanced Analytics</h3>
                    <ComingSoonBadge tooltip="Enhanced analytics features are coming soon!" />
                  </div>
                  <p className="text-sm text-foreground/70">
                    Performance insights, training load management, and progress visualization
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-warning flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Secure Relationships</h3>
                  <p className="text-sm text-foreground/70">
                    Professional coach-athlete relationship management with privacy controls
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Trophy className="w-5 h-5 text-danger flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Race Integration</h3>
                  <p className="text-sm text-foreground/70">
                    Target race selection with elevation profiles and course-specific preparation
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Workout Logging</h3>
                  <p className="text-sm text-foreground/70">
                    Comprehensive workout tracking with intensity, terrain, and performance metrics
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Mountain Peak Values */}
        <Card className="bg-content1">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mountain className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">Mountain Peak Values</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              <Chip color="primary" variant="flat">
                Excellence
              </Chip>
              <Chip color="secondary" variant="flat">
                Perseverance
              </Chip>
              <Chip color="success" variant="flat">
                Growth
              </Chip>
              <Chip color="warning" variant="flat">
                Community
              </Chip>
              <Chip color="danger" variant="flat">
                Adventure
              </Chip>
            </div>
            <p className="text-foreground/80 mt-4">
              Every feature is designed with the spirit of mountaineering - where preparation meets
              opportunity, and every summit achieved opens the path to the next peak.
            </p>
          </CardBody>
        </Card>
      </div>
    </Layout>
  )
}
