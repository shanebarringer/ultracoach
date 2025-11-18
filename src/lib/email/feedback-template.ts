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
 * Escapes HTML and converts newlines to <br> tags for safe HTML display
 */
function escapeHtmlWithLineBreaks(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br>')
}

/**
 * Normalizes a Date or string to a Date object
 */
function normalizeDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

/**
 * Formats a date safely, returning a fallback string if the date is invalid
 */
function formatDateSafely(
  value: string | Date,
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }
): string {
  try {
    const date = normalizeDate(value)
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Unknown submission time'
    }
    return date.toLocaleString(locale, options)
  } catch {
    return 'Unknown submission time'
  }
}

/**
 * Validates a URL to ensure it uses a safe scheme (http or https)
 * Supports both absolute URLs and relative paths (when baseOrigin is provided)
 * Returns the validated absolute URL if valid, or null if invalid/unsafe
 *
 * @param url - The URL to validate (absolute or relative)
 * @param baseOrigin - Optional base origin for resolving relative URLs (e.g., 'https://ultracoach.app')
 * @returns Validated absolute URL or null if invalid
 */
function validateUrl(url: string | undefined, baseOrigin?: string): string | null {
  if (!url || url.trim() === '') return null

  try {
    // Resolve URL (works for both absolute and relative if baseOrigin is provided)
    const parsed = new URL(url, baseOrigin)
    // Only allow http and https schemes
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href
    }
    return null
  } catch {
    // Invalid URL format
    return null
  }
}

export interface FeedbackEmailProps {
  feedback_type: 'bug_report' | 'feature_request' | 'general_feedback' | 'complaint' | 'compliment'
  category?: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  user_email?: string
  user_name?: string
  browser_info?: {
    userAgent?: string
    screenWidth?: number
    screenHeight?: number
    language?: string
    timezone?: string
  }
  page_url?: string
  submitted_at: string | Date
}

export const feedbackTypeLabels = {
  bug_report: '🐛 Bug Report',
  feature_request: '💡 Feature Request',
  general_feedback: '💬 General Feedback',
  complaint: '👎 Complaint',
  compliment: '👍 Compliment',
} as const

export const priorityLabels = {
  low: '🟢 Low',
  medium: '🟡 Medium',
  high: '🟠 High',
  urgent: '🔴 Urgent',
}

export function generateFeedbackEmailHTML(props: FeedbackEmailProps): string {
  const typeLabel = feedbackTypeLabels[props.feedback_type]
  const priorityLabel = priorityLabels[props.priority]

  // Escape all user-supplied values
  const safeTitle = escapeHtml(props.title)
  const safeDescription = escapeHtmlWithLineBreaks(props.description)
  const safeCategory = props.category ? escapeHtml(props.category.replace(/_/g, ' ')) : undefined
  const safeName = props.user_name ? escapeHtml(props.user_name) : undefined
  const safeEmail = props.user_email ? escapeHtml(props.user_email) : undefined

  // Validate and escape URL (only http/https schemes allowed)
  const validatedPageUrl = validateUrl(props.page_url)
  const safePageUrl = validatedPageUrl ? escapeHtml(validatedPageUrl) : undefined

  const safeUserAgent = props.browser_info?.userAgent
    ? escapeHtml(props.browser_info.userAgent)
    : undefined
  const safeLanguage = props.browser_info?.language
    ? escapeHtml(props.browser_info.language)
    : undefined
  const safeTimezone = props.browser_info?.timezone
    ? escapeHtml(props.browser_info.timezone)
    : undefined

  // Format date safely with fallback for invalid dates
  const formattedDate = formatDateSafely(props.submitted_at)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Feedback - UltraCoach</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      color: #1e40af;
      font-size: 24px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 8px;
      margin-top: 8px;
    }
    .badge-type {
      background-color: #dbeafe;
      color: #1e40af;
    }
    .badge-priority {
      background-color: #fef3c7;
      color: #92400e;
    }
    .section {
      margin: 20px 0;
    }
    .section-title {
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section-content {
      background-color: #f9fafb;
      padding: 12px;
      border-radius: 6px;
      border-left: 3px solid #3b82f6;
    }
    .metadata {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .metadata-item {
      font-size: 12px;
      color: #6b7280;
    }
    .metadata-label {
      font-weight: 600;
      color: #374151;
      display: block;
      margin-bottom: 4px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Feedback Received</h1>
      <div>
        <span class="badge badge-type">${typeLabel}</span>
        <span class="badge badge-priority">${priorityLabel}</span>
        ${safeCategory ? `<span class="badge badge-type">${safeCategory}</span>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Title</div>
      <div class="section-content">
        <strong>${safeTitle}</strong>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Description</div>
      <div class="section-content">
        ${safeDescription}
      </div>
    </div>

    <div class="metadata">
      ${
        safeName
          ? `
        <div class="metadata-item">
          <span class="metadata-label">Submitted By</span>
          ${safeName}
        </div>
      `
          : ''
      }
      ${
        safeEmail
          ? `
        <div class="metadata-item">
          <span class="metadata-label">Email</span>
          <a href="mailto:${safeEmail}">${safeEmail}</a>
        </div>
      `
          : ''
      }
      <div class="metadata-item">
        <span class="metadata-label">Submitted At</span>
        ${formattedDate}
      </div>
      ${
        safePageUrl
          ? `
        <div class="metadata-item">
          <span class="metadata-label">Page URL</span>
          <a href="${safePageUrl}">${safePageUrl}</a>
        </div>
      `
          : ''
      }
    </div>

    ${
      props.browser_info
        ? `
      <div class="section">
        <div class="section-title">Browser Information</div>
        <div class="section-content" style="font-size: 12px;">
          ${safeUserAgent ? `<div><strong>User Agent:</strong> ${safeUserAgent}</div>` : ''}
          ${props.browser_info.screenWidth && props.browser_info.screenHeight ? `<div><strong>Screen Size:</strong> ${props.browser_info.screenWidth}x${props.browser_info.screenHeight}</div>` : ''}
          ${safeLanguage ? `<div><strong>Language:</strong> ${safeLanguage}</div>` : ''}
          ${safeTimezone ? `<div><strong>Timezone:</strong> ${safeTimezone}</div>` : ''}
        </div>
      </div>
    `
        : ''
    }

    <div class="footer">
      <p>This feedback was submitted through UltraCoach</p>
      <p>Reply directly to the user's email if follow-up is needed</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export function generateFeedbackEmailText(props: FeedbackEmailProps): string {
  const typeLabel = feedbackTypeLabels[props.feedback_type]
  const priorityLabel = priorityLabels[props.priority]

  const formattedDate = formatDateSafely(props.submitted_at)
  const validatedPageUrl = validateUrl(props.page_url)

  return `
NEW FEEDBACK RECEIVED - ULTRACOACH
${'='.repeat(50)}

Type: ${typeLabel}
Priority: ${priorityLabel}
${props.category ? `Category: ${props.category.replace(/_/g, ' ')}` : ''}

TITLE
${'-'.repeat(50)}
${props.title}

DESCRIPTION
${'-'.repeat(50)}
${props.description}

METADATA
${'-'.repeat(50)}
${props.user_name ? `Submitted By: ${props.user_name}` : ''}
${props.user_email ? `Email: ${props.user_email}` : ''}
Submitted At: ${formattedDate}
${validatedPageUrl ? `Page URL: ${validatedPageUrl}` : ''}

${
  props.browser_info
    ? `
BROWSER INFORMATION
${'-'.repeat(50)}
${props.browser_info.userAgent ? `User Agent: ${props.browser_info.userAgent}` : ''}
${props.browser_info.screenWidth && props.browser_info.screenHeight ? `Screen Size: ${props.browser_info.screenWidth}x${props.browser_info.screenHeight}` : ''}
${props.browser_info.language ? `Language: ${props.browser_info.language}` : ''}
${props.browser_info.timezone ? `Timezone: ${props.browser_info.timezone}` : ''}
`
    : ''
}

${'='.repeat(50)}
This feedback was submitted through UltraCoach.
Reply directly to the user's email if follow-up is needed.
  `.trim()
}
