import { Metadata } from 'next'

import { BetaBanner } from '@/components/beta'
import Layout from '@/components/layout/Layout'

export const metadata: Metadata = {
  title: 'Beta Banner Demo - UltraCoach',
  description: 'Demo page showcasing the BetaBanner component',
}

/**
 * Demo page showcasing the BetaBanner component
 *
 * This page demonstrates both variants of the BetaBanner:
 * 1. Default variant with CTA buttons
 * 2. Email signup variant with input field
 */
export default function BetaBannerDemoPage() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-default-900 mb-6">
            Beta Banner Component Demo
          </h1>
          <p className="text-xl text-default-600 max-w-2xl mx-auto">
            Showcasing different variants of the BetaBanner component with Mountain Peak styling
          </p>
        </div>

        {/* Default variant with CTA buttons */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-default-800">Default Variant (CTA Buttons)</h2>
          <p className="text-default-600 mb-4">
            Standard banner with &quot;Get Started Free&quot; and &quot;Sign In&quot; buttons
          </p>
          <BetaBanner />
        </div>

        {/* Email signup variant */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-default-800">Email Signup Variant</h2>
          <p className="text-default-600 mb-4">
            Banner with email input field for collecting beta signups
          </p>
          <BetaBanner
            showEmailSignup
            onEmailSubmit={async (email: string) => {
              // Placeholder handler - in production this would call an API
              console.log('Email submitted:', email)
              alert(`Thanks for joining! We'll send updates to ${email}`)
            }}
          />
        </div>

        {/* Component Features */}
        <div className="mt-16 bg-default-50 border border-default-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-default-800 mb-6">Component Features</h2>
          <ul className="space-y-3 text-default-600">
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">✓</span>
              <span>
                <strong>Mountain Peak Design System:</strong> Alpine gradient background with
                decorative mountain pattern
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">✓</span>
              <span>
                <strong>Responsive Layout:</strong> Mobile-first design that adapts to all screen
                sizes
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">✓</span>
              <span>
                <strong>HeroUI Components:</strong> Built with Card, Button, and Input components
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">✓</span>
              <span>
                <strong>TypeScript:</strong> Full type safety with proper interfaces
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">✓</span>
              <span>
                <strong>Accessibility:</strong> Proper ARIA labels and semantic HTML
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">✓</span>
              <span>
                <strong>Feature Highlights:</strong> Three highlight cards showcasing beta benefits
              </span>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}
