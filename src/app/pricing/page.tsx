import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing - UltraCoach',
  description:
    'Choose the UltraCoach plan that works for you. Free for runners, affordable for coaches.',
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8 text-center">
          Simple, Transparent Pricing
        </h1>

        <p className="text-xl text-slate-600 mb-12 text-center max-w-2xl mx-auto">
          UltraCoach is free for runners and affordably priced for coaches. No hidden fees, no
          long-term contracts.
        </p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Runner Plan */}
          <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-blue-100">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-slate-800 mb-2">For Runners</h2>
              <div className="text-4xl font-bold text-blue-600 mb-4">Free</div>
              <p className="text-slate-600 mb-6">Everything you need to train with your coach</p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center text-slate-600">
                <span className="text-green-500 mr-3">✓</span>
                Access to all training plans
              </li>
              <li className="flex items-center text-slate-600">
                <span className="text-green-500 mr-3">✓</span>
                Workout logging and tracking
              </li>
              <li className="flex items-center text-slate-600">
                <span className="text-green-500 mr-3">✓</span>
                Real-time coach messaging
              </li>
              <li className="flex items-center text-slate-600">
                <span className="text-green-500 mr-3">✓</span>
                Progress analytics
              </li>
              <li className="flex items-center text-slate-600">
                <span className="text-green-500 mr-3">✓</span>
                Calendar integration
              </li>
            </ul>

            <div className="text-center">
              <a
                href="/auth/signup"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Get Started Free
              </a>
            </div>
          </div>

          {/* Coach Plan */}
          <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-green-200">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-slate-800 mb-2">For Coaches</h2>
              <div className="text-4xl font-bold text-green-600 mb-1">$29</div>
              <div className="text-slate-500 mb-4">per month</div>
              <p className="text-slate-600 mb-6">
                Professional coaching tools and unlimited athletes
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center text-slate-600">
                <span className="text-green-500 mr-3">✓</span>
                Everything in Runner plan
              </li>
              <li className="flex items-center text-slate-600">
                <span className="text-green-500 mr-3">✓</span>
                Unlimited athlete management
              </li>
              <li className="flex items-center text-slate-600">
                <span className="text-green-500 mr-3">✓</span>
                Advanced training plan templates
              </li>
              <li className="flex items-center text-slate-600">
                <span className="text-green-500 mr-3">✓</span>
                Athlete progress monitoring
              </li>
              <li className="flex items-center text-slate-600">
                <span className="text-green-500 mr-3">✓</span>
                Professional dashboard
              </li>
              <li className="flex items-center text-slate-600">
                <span className="text-green-500 mr-3">✓</span>
                Priority support
              </li>
            </ul>

            <div className="text-center">
              <a
                href="/auth/signup"
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Start Coaching
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-600">
            Questions about pricing?{' '}
            <a href="/contact" className="text-blue-600 hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
