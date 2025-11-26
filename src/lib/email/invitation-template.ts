/**
 * Email templates for the coach invitation system
 * Uses Mountain Peak design system colors and branding
 */

/**
 * HTML escaping utility to prevent XSS in email templates
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Formats the time until expiration in a human-readable way
 */
function formatExpirationTime(expiresAt: Date): string {
  const now = new Date()
  const diffMs = expiresAt.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'soon'
  if (diffDays === 1) return 'in 1 day'
  return `in ${diffDays} days`
}

export interface InvitationEmailProps {
  inviterName: string
  inviterEmail: string
  invitedRole: 'runner' | 'coach'
  personalMessage?: string
  acceptUrl: string
  declineUrl: string
  expiresAt: Date
}

// Mountain Peak Design System Colors
const colors = {
  alpineNavy: '#1e3a5f',
  sunsetOrange: '#f97316',
  meadowGreen: '#22c55e',
  skyBlue: '#0ea5e9',
  mountainMist: '#f4f7f6',
  slateGray: '#374151',
  lightGray: '#6b7280',
}

export function generateInvitationEmailHTML(props: InvitationEmailProps): string {
  const safeInviterName = escapeHtml(props.inviterName)
  const safeInviterEmail = escapeHtml(props.inviterEmail)
  const safeMessage = props.personalMessage ? escapeHtml(props.personalMessage) : null
  const safeAcceptUrl = escapeHtml(props.acceptUrl)
  const safeDeclineUrl = escapeHtml(props.declineUrl)
  const roleText = props.invitedRole === 'coach' ? 'fellow coach' : 'athlete'
  const expirationText = formatExpirationTime(props.expiresAt)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to UltraCoach</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: ${colors.slateGray};
      margin: 0;
      padding: 0;
      background-color: ${colors.mountainMist};
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, ${colors.alpineNavy} 0%, #2d4a6f 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .logo-icon {
      width: 40px;
      height: 40px;
    }
    .logo-text {
      color: white;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .tagline {
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
      margin: 0;
    }
    .content {
      padding: 32px 24px;
    }
    .heading {
      color: ${colors.alpineNavy};
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 16px 0;
      text-align: center;
    }
    .intro-text {
      font-size: 16px;
      text-align: center;
      margin-bottom: 24px;
    }
    .inviter-name {
      color: ${colors.alpineNavy};
      font-weight: 600;
    }
    .message-box {
      background-color: #f0fdf4;
      border-left: 4px solid ${colors.meadowGreen};
      padding: 16px;
      border-radius: 0 8px 8px 0;
      margin: 24px 0;
    }
    .message-label {
      color: #166534;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .message-text {
      color: ${colors.slateGray};
      font-size: 16px;
      font-style: italic;
      margin: 0;
    }
    .info-text {
      font-size: 15px;
      color: ${colors.slateGray};
      margin-bottom: 32px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .primary-button {
      display: inline-block;
      background-color: ${colors.sunsetOrange};
      color: white !important;
      padding: 14px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      transition: background-color 0.2s;
    }
    .primary-button:hover {
      background-color: #ea580c;
    }
    .expiration-text {
      color: ${colors.lightGray};
      font-size: 14px;
      text-align: center;
      margin-top: 16px;
    }
    .divider {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 32px 0 24px 0;
    }
    .decline-text {
      color: ${colors.lightGray};
      font-size: 14px;
      text-align: center;
    }
    .decline-link {
      color: ${colors.alpineNavy};
      text-decoration: underline;
    }
    .footer {
      background-color: ${colors.mountainMist};
      padding: 24px;
      text-align: center;
    }
    .footer-text {
      color: ${colors.lightGray};
      font-size: 14px;
      margin: 0 0 8px 0;
    }
    .footer-links {
      color: #9ca3af;
      font-size: 12px;
    }
    .footer-link {
      color: #9ca3af;
      text-decoration: underline;
    }
    .features {
      background-color: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .features-title {
      color: ${colors.alpineNavy};
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 12px 0;
    }
    .feature-list {
      margin: 0;
      padding-left: 20px;
      font-size: 14px;
      color: ${colors.slateGray};
    }
    .feature-list li {
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <div class="logo">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 22h20L12 2z" fill="${colors.sunsetOrange}"/>
            <path d="M12 8l-5 10h10L12 8z" fill="white" fill-opacity="0.3"/>
          </svg>
          <span class="logo-text">UltraCoach</span>
        </div>
        <p class="tagline">Elevate Your Ultramarathon Journey</p>
      </div>

      <!-- Content -->
      <div class="content">
        <h1 class="heading">You're Invited!</h1>

        <p class="intro-text">
          <span class="inviter-name">${safeInviterName}</span> (${safeInviterEmail}) has invited you to join UltraCoach as their ${roleText}.
        </p>

        ${
          safeMessage
            ? `
        <div class="message-box">
          <p class="message-label">Personal message from ${safeInviterName}:</p>
          <p class="message-text">"${safeMessage}"</p>
        </div>
        `
            : ''
        }

        <div class="features">
          <p class="features-title">What you'll get with UltraCoach:</p>
          <ul class="feature-list">
            ${
              props.invitedRole === 'runner'
                ? `
            <li>Personalized training plans tailored to your goals</li>
            <li>Direct communication with your coach</li>
            <li>Track your progress and workout history</li>
            <li>Sync with Strava for seamless activity tracking</li>
            `
                : `
            <li>Collaborate with fellow coaches on athlete development</li>
            <li>Share training methodologies and best practices</li>
            <li>Access to coaching tools and analytics</li>
            <li>Professional ultramarathon coaching platform</li>
            `
            }
          </ul>
        </div>

        <p class="info-text">
          UltraCoach is a professional ultramarathon coaching platform that helps coaches and athletes work together to achieve extraordinary goals.
        </p>

        <div class="button-container">
          <a href="${safeAcceptUrl}" class="primary-button">Accept Invitation</a>
        </div>

        <p class="expiration-text">This invitation expires ${expirationText}.</p>

        <hr class="divider">

        <p class="decline-text">
          Not interested? <a href="${safeDeclineUrl}" class="decline-link">Decline this invitation</a>
        </p>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p class="footer-text">UltraCoach - Elevate Your Ultramarathon Journey</p>
        <p class="footer-links">
          <a href="https://ultracoach.app/privacy" class="footer-link">Privacy Policy</a>
          &nbsp;·&nbsp;
          <a href="https://ultracoach.app/terms" class="footer-link">Terms of Service</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export function generateInvitationEmailText(props: InvitationEmailProps): string {
  const roleText = props.invitedRole === 'coach' ? 'fellow coach' : 'athlete'
  const expirationText = formatExpirationTime(props.expiresAt)

  return `
YOU'RE INVITED TO ULTRACOACH
${'='.repeat(50)}

${props.inviterName} (${props.inviterEmail}) has invited you to join UltraCoach as their ${roleText}.

${
  props.personalMessage
    ? `
PERSONAL MESSAGE
${'-'.repeat(50)}
"${props.personalMessage}"

`
    : ''
}
WHAT YOU'LL GET WITH ULTRACOACH
${'-'.repeat(50)}
${
  props.invitedRole === 'runner'
    ? `
• Personalized training plans tailored to your goals
• Direct communication with your coach
• Track your progress and workout history
• Sync with Strava for seamless activity tracking
`
    : `
• Collaborate with fellow coaches on athlete development
• Share training methodologies and best practices
• Access to coaching tools and analytics
• Professional ultramarathon coaching platform
`
}

ACCEPT INVITATION
${'-'.repeat(50)}
Click here to accept: ${props.acceptUrl}

This invitation expires ${expirationText}.

${'-'.repeat(50)}
Not interested? Decline here: ${props.declineUrl}

${'='.repeat(50)}
UltraCoach - Elevate Your Ultramarathon Journey
  `.trim()
}

// =====================================================
// INVITATION ACCEPTED EMAIL (sent to coach)
// =====================================================

export interface InvitationAcceptedEmailProps {
  coachName: string
  runnerName: string
  runnerEmail: string
  dashboardUrl: string
}

export function generateInvitationAcceptedEmailHTML(props: InvitationAcceptedEmailProps): string {
  const safeCoachName = escapeHtml(props.coachName)
  const safeRunnerName = escapeHtml(props.runnerName)
  const safeRunnerEmail = escapeHtml(props.runnerEmail)
  const safeDashboardUrl = escapeHtml(props.dashboardUrl)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation Accepted - UltraCoach</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: ${colors.slateGray};
      margin: 0;
      padding: 0;
      background-color: ${colors.mountainMist};
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, ${colors.meadowGreen} 0%, #16a34a 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .header-icon {
      font-size: 48px;
      margin-bottom: 8px;
    }
    .header-text {
      color: white;
      font-size: 24px;
      font-weight: 700;
      margin: 0;
    }
    .content {
      padding: 32px 24px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 16px;
    }
    .main-text {
      font-size: 16px;
      margin-bottom: 24px;
    }
    .runner-name {
      color: ${colors.alpineNavy};
      font-weight: 600;
    }
    .next-steps {
      background-color: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .next-steps-title {
      color: ${colors.alpineNavy};
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 12px 0;
    }
    .steps-list {
      margin: 0;
      padding-left: 20px;
      font-size: 14px;
      color: ${colors.slateGray};
    }
    .steps-list li {
      margin-bottom: 8px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .primary-button {
      display: inline-block;
      background-color: ${colors.alpineNavy};
      color: white !important;
      padding: 14px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
    }
    .footer {
      background-color: ${colors.mountainMist};
      padding: 24px;
      text-align: center;
    }
    .footer-text {
      color: ${colors.lightGray};
      font-size: 14px;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="header-icon">🎉</div>
        <p class="header-text">Great News!</p>
      </div>

      <div class="content">
        <p class="greeting">Hi ${safeCoachName},</p>

        <p class="main-text">
          <span class="runner-name">${safeRunnerName}</span> (${safeRunnerEmail}) has accepted your invitation to join UltraCoach! They are now connected to your coaching account.
        </p>

        <div class="next-steps">
          <p class="next-steps-title">You can now:</p>
          <ul class="steps-list">
            <li>Assign training plans to ${safeRunnerName}</li>
            <li>Track their workouts and progress</li>
            <li>Communicate through the messaging system</li>
            <li>View their Strava activity sync</li>
          </ul>
        </div>

        <div class="button-container">
          <a href="${safeDashboardUrl}" class="primary-button">View Dashboard</a>
        </div>
      </div>

      <div class="footer">
        <p class="footer-text">UltraCoach - Elevate Your Ultramarathon Journey</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export function generateInvitationAcceptedEmailText(props: InvitationAcceptedEmailProps): string {
  return `
INVITATION ACCEPTED - ULTRACOACH
${'='.repeat(50)}

Hi ${props.coachName},

Great news! ${props.runnerName} (${props.runnerEmail}) has accepted your invitation to join UltraCoach! They are now connected to your coaching account.

YOU CAN NOW
${'-'.repeat(50)}
• Assign training plans to ${props.runnerName}
• Track their workouts and progress
• Communicate through the messaging system
• View their Strava activity sync

View your dashboard: ${props.dashboardUrl}

${'='.repeat(50)}
UltraCoach - Elevate Your Ultramarathon Journey
  `.trim()
}
