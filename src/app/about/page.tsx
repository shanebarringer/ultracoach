import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About UltraCoach',
  description:
    'Learn more about UltraCoach - the premier platform for ultramarathon coaching and training.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8 text-center">About UltraCoach</h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-slate-600 mb-8 text-center">
            The premier platform for ultramarathon coaching and training management.
          </p>

          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Our Mission</h2>
            <p className="text-slate-600 mb-4">
              UltraCoach is dedicated to empowering coaches and runners to achieve their
              ultramarathon goals through professional training management, real-time communication,
              and data-driven insights.
            </p>
            <p className="text-slate-600">
              We understand that ultramarathon training requires careful periodization, personalized
              attention, and seamless coordination between coaches and athletes. Our platform
              provides the tools to make this process efficient, effective, and enjoyable.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Key Features</h2>
            <ul className="space-y-3 text-slate-600">
              <li>• Professional training plan management with race-centric periodization</li>
              <li>• Real-time coach-runner communication and progress tracking</li>
              <li>• Advanced analytics and performance insights</li>
              <li>• Comprehensive workout logging and calendar integration</li>
              <li>• Secure relationship management between coaches and athletes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
