import { expect, test } from '@playwright/test'

// TODO: Enable these tests after adding data-testids to profile components
// These tests require:
// - data-testid="profile-content" on main profile container
// - data-testid="about-me-section" on about me section
// - data-testid="certifications-section" on certifications section
// - data-testid="social-profiles-section" on social profiles section
// - data-testid="edit-about-me" on edit button
// - data-testid="profile-skeleton" on loading skeleton
test.describe.skip('Profile Management API', () => {
  test.use({ storageState: './playwright/.auth/coach.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')
  })

  test('should successfully fetch profile data', async ({ page }) => {
    // Wait for profile data to load
    await page.waitForSelector('[data-testid="profile-content"]', { timeout: 10000 })

    // Verify profile sections are visible
    await expect(page.getByTestId('about-me-section')).toBeVisible()
    await expect(page.getByTestId('certifications-section')).toBeVisible()
    await expect(page.getByTestId('social-profiles-section')).toBeVisible()
  })

  test('should update bio successfully', async ({ page }) => {
    // Click edit button for About Me section
    await page.getByTestId('edit-about-me').click()

    // Update bio field
    const bioTextarea = page.getByLabel(/bio|about me/i)
    await bioTextarea.fill(
      'Ultramarathon coach with 15+ years of experience helping runners achieve their goals.'
    )

    // Save changes
    await page.getByRole('button', { name: /save/i }).click()

    // Wait for API response
    await page.waitForResponse(
      response => response.url().includes('/api/profile') && response.request().method() === 'PUT'
    )

    // Verify success message
    await expect(page.getByText(/profile updated successfully/i)).toBeVisible()

    // Refresh page and verify changes persisted
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('about-me-section')).toContainText(
      'Ultramarathon coach with 15+ years'
    )
  })

  test('should handle validation errors gracefully', async ({ page }) => {
    await page.getByTestId('edit-about-me').click()

    // Enter bio exceeding max length (1000 characters)
    const longBio = 'A'.repeat(1500)
    const bioTextarea = page.getByLabel(/bio|about me/i)
    await bioTextarea.fill(longBio)

    await page.getByRole('button', { name: /save/i }).click()

    // Verify error message
    await expect(
      page.getByText(/bio must be less than 1000 characters|invalid input data/i)
    ).toBeVisible()

    // Verify profile wasn't updated
    const response = await page.waitForResponse(
      response => response.url().includes('/api/profile') && response.request().method() === 'PUT'
    )
    expect(response.status()).toBe(400)
  })

  test('should update specialties array', async ({ page }) => {
    await page.getByTestId('edit-about-me').click()

    // Add specialty tags
    const specialtyInput = page.getByLabel(/specialties/i)
    await specialtyInput.fill('100 Mile Races')
    await page.keyboard.press('Enter')

    await specialtyInput.fill('Mountain Running')
    await page.keyboard.press('Enter')

    await specialtyInput.fill('Nutrition Strategy')
    await page.keyboard.press('Enter')

    // Save changes
    await page.getByRole('button', { name: /save/i }).click()

    await page.waitForResponse(
      response => response.url().includes('/api/profile') && response.request().method() === 'PUT'
    )

    // Verify success
    await expect(page.getByText(/profile updated successfully/i)).toBeVisible()

    // Refresh and verify specialties persisted
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('specialties-list')).toContainText('100 Mile Races')
    await expect(page.getByTestId('specialties-list')).toContainText('Mountain Running')
    await expect(page.getByTestId('specialties-list')).toContainText('Nutrition Strategy')
  })

  test('should handle database connection errors', async ({ page, context }) => {
    // Intercept API call and simulate connection error
    await page.route('**/api/profile', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Database unavailable',
            type: 'CONNECTION_ERROR',
            message: 'Unable to connect to database',
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.getByTestId('edit-about-me').click()
    await page.getByLabel(/bio/i).fill('Test bio')
    await page.getByRole('button', { name: /save/i }).click()

    // Verify error message displays connection error
    await expect(
      page.getByText(/database unavailable|unable to connect to database/i)
    ).toBeVisible()

    // Verify retry suggestion is shown
    await expect(page.getByText(/please try again/i)).toBeVisible()
  })

  test('should handle constraint violations', async ({ page }) => {
    // Simulate duplicate entry error
    await page.route('**/api/profile', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Duplicate entry',
            type: 'CONSTRAINT_VIOLATION',
            message: 'A profile entry with this data already exists',
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.getByTestId('edit-about-me').click()
    await page.getByLabel(/bio/i).fill('Test bio')
    await page.getByRole('button', { name: /save/i }).click()

    // Verify constraint violation message
    await expect(page.getByText(/duplicate entry|already exists/i)).toBeVisible()

    // Verify no retry button (constraint violations shouldn't retry)
    await expect(page.getByRole('button', { name: /retry/i })).not.toBeVisible()
  })

  test('should update availability status', async ({ page }) => {
    // Toggle availability status
    const availabilityToggle = page.getByTestId('availability-toggle')
    await availabilityToggle.click()

    // Wait for API response
    await page.waitForResponse(
      response => response.url().includes('/api/profile') && response.request().method() === 'PUT'
    )

    // Verify status changed
    await expect(page.getByText(/availability updated/i)).toBeVisible()

    // Refresh and verify persistence
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify toggle state persisted
    const toggleState = await availabilityToggle.getAttribute('aria-checked')
    expect(toggleState).toBeTruthy()
  })

  test('should update hourly rate', async ({ page }) => {
    await page.getByTestId('edit-about-me').click()

    // Update hourly rate
    const rateInput = page.getByLabel(/hourly rate/i)
    await rateInput.fill('$150/hour')

    await page.getByRole('button', { name: /save/i }).click()

    await page.waitForResponse(
      response => response.url().includes('/api/profile') && response.request().method() === 'PUT'
    )

    // Verify success
    await expect(page.getByText(/profile updated successfully/i)).toBeVisible()

    // Verify rate displayed correctly
    await expect(page.getByTestId('hourly-rate-display')).toContainText('$150/hour')
  })

  test('should handle empty optional fields', async ({ page }) => {
    await page.getByTestId('edit-about-me').click()

    // Clear all optional fields
    await page.getByLabel(/location/i).fill('')
    await page.getByLabel(/website/i).fill('')

    await page.getByRole('button', { name: /save/i }).click()

    await page.waitForResponse(
      response => response.url().includes('/api/profile') && response.request().method() === 'PUT'
    )

    // Verify success (empty fields should be valid)
    await expect(page.getByText(/profile updated successfully/i)).toBeVisible()
  })

  test('should validate website URL format', async ({ page }) => {
    await page.getByTestId('edit-about-me').click()

    // Enter invalid URL
    await page.getByLabel(/website/i).fill('not-a-valid-url')

    await page.getByRole('button', { name: /save/i }).click()

    // Verify validation error
    await expect(page.getByText(/invalid url|please enter a valid website/i)).toBeVisible()
  })

  test('should show loading skeleton while fetching profile', async ({ page, context }) => {
    // Delay API response to see loading state
    await page.route('**/api/profile', async route => {
      if (route.request().method() === 'GET') {
        await new Promise(resolve => setTimeout(resolve, 2000))
        await route.continue()
      } else {
        await route.continue()
      }
    })

    await page.goto('/profile')

    // Verify skeleton loaders appear
    await expect(page.getByTestId('profile-skeleton')).toBeVisible()

    // Wait for actual content to load
    await page.waitForSelector('[data-testid="profile-content"]', { timeout: 10000 })

    // Verify skeleton disappears
    await expect(page.getByTestId('profile-skeleton')).not.toBeVisible()
  })
})

test.describe.skip('Profile Error Handling', () => {
  test.use({ storageState: './playwright/.auth/coach.json' })

  test('should retry on transient errors', async ({ page }) => {
    let requestCount = 0

    // Simulate transient error on first request, success on retry
    await page.route('**/api/profile', async route => {
      requestCount++

      if (route.request().method() === 'PUT') {
        if (requestCount === 1) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Failed to update profile',
              type: 'DATABASE_ERROR',
            }),
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Profile updated successfully' }),
          })
        }
      } else {
        await route.continue()
      }
    })

    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    await page.getByTestId('edit-about-me').click()
    await page.getByLabel(/bio/i).fill('Updated bio')
    await page.getByRole('button', { name: /save/i }).click()

    // Verify error appears
    await expect(page.getByText(/failed to update profile/i)).toBeVisible()

    // Click retry button
    await page.getByRole('button', { name: /retry/i }).click()

    // Verify success on retry
    await expect(page.getByText(/profile updated successfully/i)).toBeVisible()
    expect(requestCount).toBeGreaterThan(1)
  })

  test('should not retry on permanent errors', async ({ page }) => {
    await page.route('**/api/profile', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Invalid input data',
            type: 'VALIDATION_ERROR',
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    await page.getByTestId('edit-about-me').click()
    await page.getByLabel(/bio/i).fill('Test bio')
    await page.getByRole('button', { name: /save/i }).click()

    // Verify error appears
    await expect(page.getByText(/invalid input data/i)).toBeVisible()

    // Verify no retry button for validation errors
    await expect(page.getByRole('button', { name: /retry/i })).not.toBeVisible()
  })
})
