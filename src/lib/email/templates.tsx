/**
 * Email Templates
 *
 * Reusable email templates using React components for Resend.
 * All templates use Mountain Peak design system colors and styling.
 */
import React from 'react'

/**
 * Base email wrapper with consistent styling
 */
interface EmailWrapperProps {
  children: React.ReactNode
}

function EmailWrapper({ children }: EmailWrapperProps) {
  return (
    <html>
      <body
        style={{
          fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
          backgroundColor: '#f7fafc',
          margin: 0,
          padding: 0,
        }}
      >
        <table
          cellPadding="0"
          cellSpacing="0"
          style={{ width: '100%', maxWidth: '600px', margin: '0 auto', padding: '20px' }}
        >
          <tbody>
            <tr>
              <td>{children}</td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  )
}

/**
 * Message Received Template
 */
export function MessageReceivedTemplate({
  recipientName,
  senderName,
  messagePreview,
  messageUrl,
}: {
  recipientName: string
  senderName: string
  messagePreview: string
  messageUrl: string
}) {
  return (
    <EmailWrapper>
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h1 style={{ color: '#1a365d', marginTop: 0, marginBottom: '24px' }}>
          🏔️ New Message from {senderName}
        </h1>

        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '24px',
          }}
        >
          <p style={{ color: 'white', margin: 0, fontSize: '16px', lineHeight: '1.5' }}>
            {messagePreview}
          </p>
        </div>

        <p style={{ color: '#4a5568', marginBottom: '24px' }}>
          Hi {recipientName}, you have a new message waiting for you on UltraCoach.
        </p>

        <a
          href={messageUrl}
          style={{
            display: 'inline-block',
            backgroundColor: '#667eea',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '600',
          }}
        >
          View Message
        </a>

        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0' }} />

        <p style={{ color: '#718096', fontSize: '14px', marginBottom: 0 }}>
          <small>
            This email was sent because you have email notifications enabled for messages.
            <br />
            You can adjust your notification preferences in your UltraCoach settings.
          </small>
        </p>
      </div>
    </EmailWrapper>
  )
}

/**
 * Workout Assigned Template
 */
export function WorkoutAssignedTemplate({
  recipientName,
  coachName,
  workoutType,
  workoutDate,
  workoutUrl,
}: {
  recipientName: string
  coachName: string
  workoutType: string
  workoutDate: string
  workoutUrl: string
}) {
  return (
    <EmailWrapper>
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h1 style={{ color: '#1a365d', marginTop: 0, marginBottom: '24px' }}>
          🏃 New Workout Assigned
        </h1>

        <p style={{ color: '#4a5568', marginBottom: '16px' }}>Hi {recipientName},</p>

        <p style={{ color: '#4a5568', marginBottom: '24px' }}>
          {coachName} has assigned you a new <strong>{workoutType}</strong> workout scheduled for{' '}
          {workoutDate}.
        </p>

        <div
          style={{
            background: '#f7fafc',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '24px',
          }}
        >
          <p style={{ margin: 0, color: '#2d3748' }}>
            <strong>Workout Type:</strong> {workoutType}
            <br />
            <strong>Date:</strong> {workoutDate}
          </p>
        </div>

        <a
          href={workoutUrl}
          style={{
            display: 'inline-block',
            backgroundColor: '#667eea',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '600',
          }}
        >
          View Workout Details
        </a>

        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0' }} />

        <p style={{ color: '#718096', fontSize: '14px', marginBottom: 0 }}>
          <small>Altitude achieved: Ready to conquer the summit 🚀</small>
        </p>
      </div>
    </EmailWrapper>
  )
}

/**
 * Daily Digest Template
 */
export function DailyDigestTemplate({
  recipientName,
  date,
  upcomingWorkouts,
  unreadMessages,
  dashboardUrl,
}: {
  recipientName: string
  date: string
  upcomingWorkouts: Array<{ type: string; distance?: string; time?: string }>
  unreadMessages: number
  dashboardUrl: string
}) {
  return (
    <EmailWrapper>
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h1 style={{ color: '#1a365d', marginTop: 0, marginBottom: '8px' }}>
          🏔️ Your Daily Summit Report
        </h1>
        <p style={{ color: '#718096', marginTop: 0, marginBottom: '24px' }}>{date}</p>

        <p style={{ color: '#4a5568', marginBottom: '24px' }}>Good morning, {recipientName}!</p>

        {/* Upcoming Workouts Section */}
        {upcomingWorkouts.length > 0 && (
          <>
            <h2 style={{ color: '#2d3748', fontSize: '18px', marginBottom: '16px' }}>
              📅 Today&apos;s Training
            </h2>
            <div style={{ marginBottom: '24px' }}>
              {upcomingWorkouts.map((workout, index) => (
                <div
                  key={index}
                  style={{
                    background: '#f7fafc',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                  }}
                >
                  <p style={{ margin: 0, color: '#2d3748' }}>
                    <strong>{workout.type}</strong>
                    {workout.distance && ` • ${workout.distance}`}
                    {workout.time && ` • ${workout.time}`}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Unread Messages */}
        {unreadMessages > 0 && (
          <div
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            <p style={{ color: 'white', margin: 0 }}>
              💬 You have <strong>{unreadMessages}</strong> unread message
              {unreadMessages > 1 ? 's' : ''}
            </p>
          </div>
        )}

        <a
          href={dashboardUrl}
          style={{
            display: 'inline-block',
            backgroundColor: '#667eea',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '600',
          }}
        >
          Open UltraCoach Dashboard
        </a>

        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0' }} />

        <p style={{ color: '#718096', fontSize: '14px', marginBottom: 0 }}>
          <small>
            Keep climbing towards your goals! 🚀
            <br />
            Unsubscribe from daily digests in your notification settings.
          </small>
        </p>
      </div>
    </EmailWrapper>
  )
}

/**
 * Weekly Summary Template
 */
export function WeeklySummaryTemplate({
  recipientName,
  weekRange,
  totalDistance,
  completedWorkouts,
  totalWorkouts,
  streak,
  dashboardUrl,
}: {
  recipientName: string
  weekRange: string
  totalDistance: string
  completedWorkouts: number
  totalWorkouts: number
  streak: number
  dashboardUrl: string
}) {
  const completionRate =
    totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0

  return (
    <EmailWrapper>
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h1 style={{ color: '#1a365d', marginTop: 0, marginBottom: '8px' }}>
          📊 Your Weekly Training Summary
        </h1>
        <p style={{ color: '#718096', marginTop: 0, marginBottom: '24px' }}>{weekRange}</p>

        <p style={{ color: '#4a5568', marginBottom: '24px' }}>
          Great work this week, {recipientName}!
        </p>

        {/* Stats Grid */}
        <div style={{ marginBottom: '24px' }}>
          <table cellPadding="12" cellSpacing="0" style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td
                  style={{
                    background: '#f7fafc',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    width: '50%',
                  }}
                >
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea' }}>
                    {totalDistance}
                  </div>
                  <div style={{ color: '#718096', fontSize: '14px' }}>Total Distance</div>
                </td>
                <td style={{ width: '16px' }}></td>
                <td
                  style={{
                    background: '#f7fafc',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    width: '50%',
                  }}
                >
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea' }}>
                    {completionRate}%
                  </div>
                  <div style={{ color: '#718096', fontSize: '14px' }}>Completion Rate</div>
                </td>
              </tr>
              <tr>
                <td style={{ height: '16px' }}></td>
              </tr>
              <tr>
                <td
                  style={{
                    background: '#f7fafc',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea' }}>
                    {completedWorkouts}/{totalWorkouts}
                  </div>
                  <div style={{ color: '#718096', fontSize: '14px' }}>Workouts Completed</div>
                </td>
                <td style={{ width: '16px' }}></td>
                <td
                  style={{
                    background: '#f7fafc',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea' }}>
                    {streak} 🔥
                  </div>
                  <div style={{ color: '#718096', fontSize: '14px' }}>Day Streak</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {streak >= 7 && (
          <div
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            <p style={{ color: 'white', margin: 0, textAlign: 'center', fontSize: '18px' }}>
              🎉 Amazing! You&apos;ve maintained a {streak}-day training streak!
            </p>
          </div>
        )}

        <a
          href={dashboardUrl}
          style={{
            display: 'inline-block',
            backgroundColor: '#667eea',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '600',
          }}
        >
          View Full Analytics
        </a>

        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0' }} />

        <p style={{ color: '#718096', fontSize: '14px', marginBottom: 0 }}>
          <small>
            Keep pushing towards the summit! 🏔️
            <br />
            Manage your email preferences in settings.
          </small>
        </p>
      </div>
    </EmailWrapper>
  )
}
