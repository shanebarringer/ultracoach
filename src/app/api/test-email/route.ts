import { NextRequest, NextResponse } from 'next/server'

import { createLogger } from '@/lib/logger'

const logger = createLogger('test-email')

export async function POST(request: NextRequest) {
  try {
    const { to, subject = 'UltraCoach Email Test' } = await request.json()

    if (!to) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 })
    }

    // Check if we have Resend API key
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      logger.error('RESEND_API_KEY not found in environment variables')
      return NextResponse.json(
        {
          error: 'Email service not configured - RESEND_API_KEY missing',
          configured: false,
        },
        { status: 500 }
      )
    }

    logger.info('Testing email with Resend', { to, subject })

    // Make direct API call to Resend to test
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'UltraCoach <onboarding@resend.dev>',
        to: [to],
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a365d; text-align: center;">🏔️ UltraCoach Email Test</h1>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: white; margin: 0;">Email System Verification</h2>
              <p style="color: white; margin: 10px 0 0 0;">Your UltraCoach email integration is working correctly!</p>
            </div>
            <div style="padding: 20px; background: #f7fafc; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2d3748; margin: 0 0 10px 0;">Test Details:</h3>
              <ul style="color: #4a5568; margin: 0; padding-left: 20px;">
                <li><strong>Sent to:</strong> ${to}</li>
                <li><strong>Service:</strong> Resend</li>
                <li><strong>Status:</strong> Successfully delivered</li>
                <li><strong>Time:</strong> ${new Date().toISOString()}</li>
              </ul>
            </div>
            <p style="color: #718096; text-align: center; margin-top: 30px;">
              This is a test email from your UltraCoach application.<br>
              <small>Altitude achieved: Peak Performance 🚀</small>
            </p>
          </div>
        `,
        text: `
UltraCoach Email Test

Your UltraCoach email integration is working correctly!

Test Details:
- Sent to: ${to}
- Service: Resend
- Status: Successfully delivered
- Time: ${new Date().toISOString()}

This is a test email from your UltraCoach application.
Altitude achieved: Peak Performance 🚀
        `,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      logger.error('Resend API error:', result)
      return NextResponse.json(
        {
          error: 'Failed to send test email via Resend',
          details: result,
          configured: true,
        },
        { status: 500 }
      )
    }

    logger.info('Test email sent successfully', { emailId: result.id })

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      emailId: result.id,
      configured: true,
      provider: 'Resend',
    })
  } catch (error) {
    logger.error('Error sending test email:', error)
    return NextResponse.json(
      {
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
