import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact UltraCoach',
  description: 'Get in touch with the UltraCoach team for support, questions, or feedback.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8 text-center">Contact Us</h1>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <p className="text-xl text-slate-600 mb-8 text-center">
            We&apos;d love to hear from you. Reach out with any questions or feedback.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-semibold text-slate-800 mb-4">Get Support</h2>
              <p className="text-slate-600 mb-4">
                Having trouble with your account or need help getting started? We&apos;re here to
                help.
              </p>
              <p className="text-slate-600">
                <strong>Email:</strong> support@ultracoach.dev
                <br />
                <strong>Response Time:</strong> Within 24 hours
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-slate-800 mb-4">Share Feedback</h2>
              <p className="text-slate-600 mb-4">
                Your feedback helps us improve UltraCoach. Let us know what features you&apos;d like
                to see.
              </p>
              <p className="text-slate-600">
                <strong>Email:</strong> feedback@ultracoach.dev
                <br />
                <strong>Feature Requests:</strong> Always welcome
              </p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-200">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Business Inquiries</h2>
            <p className="text-slate-600">
              Interested in partnerships or enterprise solutions? Contact us at
              business@ultracoach.dev
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
