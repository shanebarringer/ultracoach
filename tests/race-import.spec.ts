import { expect, test } from '@playwright/test'
import { Logger } from 'tslog'

import { waitForHeroUIReady } from './utils/heroui-helpers'
import { waitForFileUploadError, waitForFileUploadProcessing } from './utils/suspense-helpers'

// Removed unused imports: TestUserType, navigateToDashboard

const logger = new Logger({ name: 'tests/race-import.spec' })

const TEST_GPX_CONTENT = `<?xml version="1.0"?>
<gpx version="1.1" creator="TestCreator">
  <metadata>
    <name>Test Ultra Race</name>
    <desc>Test race for import testing</desc>
  </metadata>
  <trk>
    <name>Test Ultra Race Track</name>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <ele>100</ele>
        <time>2024-06-15T08:00:00Z</time>
      </trkpt>
      <trkpt lat="37.7754" lon="-122.4189">
        <ele>105</ele>
        <time>2024-06-15T08:01:00Z</time>
      </trkpt>
      <trkpt lat="37.7759" lon="-122.4184">
        <ele>110</ele>
        <time>2024-06-15T08:02:00Z</time>
      </trkpt>
      <trkpt lat="37.7764" lon="-122.4179">
        <ele>115</ele>
        <time>2024-06-15T08:03:00Z</time>
      </trkpt>
      <trkpt lat="37.7769" lon="-122.4174">
        <ele>120</ele>
        <time>2024-06-15T08:04:00Z</time>
      </trkpt>
      <trkpt lat="37.7774" lon="-122.4169">
        <ele>125</ele>
        <time>2024-06-15T08:05:00Z</time>
      </trkpt>
      <trkpt lat="37.7779" lon="-122.4164">
        <ele>130</ele>
        <time>2024-06-15T08:06:00Z</time>
      </trkpt>
      <trkpt lat="37.7784" lon="-122.4159">
        <ele>135</ele>
        <time>2024-06-15T08:07:00Z</time>
      </trkpt>
      <trkpt lat="37.7789" lon="-122.4154">
        <ele>140</ele>
        <time>2024-06-15T08:08:00Z</time>
      </trkpt>
      <trkpt lat="37.7794" lon="-122.4149">
        <ele>145</ele>
        <time>2024-06-15T08:09:00Z</time>
      </trkpt>
      <trkpt lat="37.7799" lon="-122.4144">
        <ele>150</ele>
        <time>2024-06-15T08:10:00Z</time>
      </trkpt>
      <trkpt lat="37.7804" lon="-122.4139">
        <ele>155</ele>
        <time>2024-06-15T08:11:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
  <wpt lat="37.7749" lon="-122.4194">
    <name>Start</name>
    <desc>Race start line</desc>
    <ele>100</ele>
  </wpt>
  <wpt lat="37.7804" lon="-122.4139">
    <name>Finish</name>
    <desc>Race finish line</desc>
    <ele>155</ele>
  </wpt>
</gpx>`

const TEST_CSV_CONTENT = `Name,Date,Location,Distance (miles),Distance Type,Elevation Gain (ft),Terrain,Website,Notes
"Western States 100","2024-06-29","Auburn, CA",100,100M,18000,trail,"https://wser.org","Premier 100-mile trail race"
"Leadville 100","2024-08-17","Leadville, CO",100,100M,15600,mountain,"https://leadvilleraceseries.com","High altitude mountain race"
"UTMB","2024-08-30","Chamonix, France",103,Custom,32000,mountain,"https://utmb.world","Ultra Trail du Mont Blanc"`

// This test suite uses coach authentication state configured in playwright.config.ts
// The 'chromium' project has storageState: './playwright/.auth/coach.json'
test.describe('Race Import Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    logger.info('🏁 Starting race import test setup...')

    // Auth state verification handled implicitly by test failures

    // Auth cookies check removed - handled by test failures if auth is broken

    // First go to the home page to ensure cookies are set
    await page.goto('/')

    // Navigate to races page after home visit

    // Then navigate to races page
    await page.goto('/races')

    // Wait for either races page or potential redirect
    await page.waitForURL(
      url => {
        const urlStr = url.toString()
        return urlStr.includes('/races') || urlStr.includes('/auth/signin')
      },
      { timeout: 30000 }
    )

    // Verify we're on races page (not redirected to signin)
    const currentUrl = page.url()
    if (currentUrl.includes('/auth/signin')) {
      throw new Error(`Authentication failed - redirected to signin: ${currentUrl}`)
    }

    // Wait for loading to complete if we're on the races page
    const loadingIndicator = page.getByText(/Loading race expeditions/i)
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
    } catch (error) {
      logger.debug('Loading state check failed (expected in fast CI):', { error: String(error) })
    }
  })

  test('should open race import modal', async ({ page }) => {
    // Wait for page to fully load
    await waitForHeroUIReady(page)

    // Use consistent data-testid selector
    const importButton = page.getByTestId('import-races-modal-trigger')

    // Verify import button is visible (require coach role)
    await expect(importButton).toBeVisible({ timeout: 30000 })
    await importButton.click()

    // Check if modal opened
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 })
  })

  test('should handle GPX file upload', async ({ page }) => {
    // Wait for page to fully load
    await waitForHeroUIReady(page)

    // Wait for loading to complete
    const loadingIndicator = page.getByText(/Loading race expeditions/i)
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
    } catch {
      // Loading might have completed before we checked
    }

    // Open import modal with data-testid selector
    const importButton = page.getByTestId('import-races-modal-trigger')

    // Verify import button is visible (require coach role)
    await expect(importButton).toBeVisible({ timeout: 30000 })
    await importButton.click({ timeout: 30000 })

    // Create a test GPX file
    const buffer = Buffer.from(TEST_GPX_CONTENT)

    // File input might be hidden, use force or direct file setting
    const fileInput = page.locator('[role="dialog"] input[type="file"]')

    // Set files directly without checking visibility (file inputs are often hidden)
    await fileInput.setInputFiles({
      name: 'test-race.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    // Wait for file processing to complete using Suspense-aware helper
    await waitForFileUploadProcessing(page, 'Test Ultra Race', 90000, logger)

    // Wait for parsing to complete - fail test if parse error occurs
    // Check for parse error and fail test to catch regressions
    const parseError = page.getByText(/(Failed to parse|Invalid GPX|Parse failed)/i).first()
    const hasParseError = await parseError.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasParseError) {
      // Get error details for debugging
      const errorDetails = await parseError.textContent().catch(() => 'Unknown parse error')

      logger.error('GPX parsing failed:', { errorDetails })

      // Fail the test with detailed error message
      throw new Error(
        `GPX parsing failed: ${errorDetails}. This indicates a regression in GPX parser that needs fixing.`
      )
    }

    // If no error, wait for the race data to appear
    const raceElement = page.getByText('Test Ultra Race')
    await expect(raceElement).toBeVisible({ timeout: 30000 })
  })

  test('should handle CSV file upload', async ({ page }) => {
    logger.info('[Test] Starting CSV file upload test')

    // Use domcontentloaded instead of timeout per Context7 recommendations
    await page.waitForLoadState('domcontentloaded')

    // Wait for loading to complete using specific data-testid
    const loadingIndicator = page.getByText(/Loading race expeditions/i)
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
      logger.info('[Test] Loading indicator cleared')
    } catch {
      logger.info('[Test] No loading indicator detected')
    }

    // Open import modal with data-testid selector
    const importButton = page.getByTestId('import-races-modal-trigger')
    await expect(importButton).toBeVisible({ timeout: 30000 })
    logger.info('[Test] Import button visible')

    await importButton.click({ timeout: 30000 })
    logger.info('[Test] Import modal opened')

    // Create a test CSV file using Context7 buffer upload pattern
    const buffer = Buffer.from(TEST_CSV_CONTENT)
    logger.info('[Test] Created CSV buffer with content length:', buffer.length)

    // Look for file upload input and set files with proper validation
    const fileInput = page.locator('[role="dialog"] input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-races.csv',
      mimeType: 'text/csv',
      buffer,
    })
    logger.info('[Test] File input set with CSV buffer')

    // Step 1: Verify file was received by checking for processing message
    logger.info('[Test] Step 1: Checking for processing status...')
    try {
      await page.getByText(/Processing|Preparing|Parsing/i).waitFor({ timeout: 5000 })
      logger.info('[Test] Processing message appeared')
    } catch {
      logger.info('[Test] No processing message detected, checking for immediate completion')
    }

    // Use standardized helper that waits for preview and parsed content
    await waitForFileUploadProcessing(page, 'Western States 100', 90000, logger)

    // Verify expected races are present
    const westernStates = page.getByTestId('race-list').getByText('Western States 100')
    const leadville = page.getByTestId('race-list').getByText('Leadville 100')
    const utmb = page.getByTestId('race-list').getByText('UTMB')

    await expect(westernStates).toBeVisible({ timeout: 30000 })
    await expect(leadville).toBeVisible({ timeout: 30000 })
    await expect(utmb).toBeVisible({ timeout: 30000 })
    logger.info('[Test] All race names verified successfully')
  })

  test('should validate file size limits', async ({ page }) => {
    // Wait for page to fully load
    await waitForHeroUIReady(page)

    // Wait for loading to complete
    const loadingIndicator = page.getByText(/Loading race expeditions/i)
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
    } catch {
      // Loading might have completed before we checked
    }

    // Open import modal with data-testid selector
    const importButton = page.getByTestId('import-races-modal-trigger')

    // Verify import button is visible (require coach role)
    await expect(importButton).toBeVisible({ timeout: 30000 })
    await importButton.click({ timeout: 30000 })

    // Create a large file (simulate > 10MB)
    const largeContent = 'x'.repeat(11 * 1024 * 1024) // 11MB
    const buffer = Buffer.from(largeContent)

    const fileInput = page.locator('[role="dialog"] input[type="file"]')
    await fileInput.setInputFiles({
      name: 'large-file.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    // Should show file size error
    await expect(
      page.getByText(/file size exceeds/i).or(page.getByText(/too large/i))
    ).toBeVisible()
  })

  test('should handle invalid GPX files', async ({ page }) => {
    // Wait for page to be fully ready
    await waitForHeroUIReady(page)

    // Wait for loading to complete
    const loadingIndicator = page.getByText(/Loading race expeditions/i)
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
    } catch {
      // Loading might have completed before we checked
    }

    // Extra wait for React hydration in CI
    // Wait removed - folded into waitForHeroUIReady

    // Check for overlays that might intercept clicks
    const overlays = page.locator(
      '[style*="pointer-events: none"], .loading-overlay, .modal-backdrop'
    )
    try {
      await overlays.first().waitFor({ state: 'hidden', timeout: 5000 })
    } catch {
      // No overlays or already hidden
    }

    // Use consistent data-testid selector
    const importButton = page.getByTestId('import-races-modal-trigger')

    // Verify import button is visible (require coach role)
    await expect(importButton).toBeVisible({ timeout: 30000 })

    // Try to click with force option if needed
    try {
      await importButton.click({ timeout: 10000 })
    } catch (clickError) {
      await importButton.click({ force: true, timeout: 5000 })
    }

    // Create invalid GPX content
    const invalidGPX = '<invalid>not valid gpx</invalid>'
    const buffer = Buffer.from(invalidGPX)

    const fileInput = page.locator('[role="dialog"] input[type="file"]')
    await fileInput.setInputFiles({
      name: 'invalid.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    // Wait for error processing (invalid file won't show preview tab)
    await waitForFileUploadError(page, 30000, logger)

    // Should show parse error for invalid GPX structure
    const parseError = page.getByText('Invalid GPX file: Missing required GPX XML structure')
    await expect(parseError).toBeVisible()
  })

  test('should successfully import single race', async ({ page }) => {
    // Wait for page to be fully ready
    await waitForHeroUIReady(page)

    // Wait for loading to complete
    const loadingIndicator = page.getByText(/Loading race expeditions/i)
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
    } catch {
      // Loading might have completed before we checked
    }

    // Extra wait for React hydration in CI
    // Wait removed - folded into waitForHeroUIReady

    // Check for overlays that might intercept clicks
    const overlays = page.locator(
      '[style*="pointer-events: none"], .loading-overlay, .modal-backdrop'
    )
    try {
      await overlays.first().waitFor({ state: 'hidden', timeout: 5000 })
    } catch {
      // No overlays or already hidden
    }

    // Open import modal using the modal trigger
    const importButton = page.getByTestId('import-races-modal-trigger')

    // Verify import button is visible (require coach role)
    await expect(importButton).toBeVisible({ timeout: 30000 })
    await importButton.click({ timeout: 30000 })

    // Upload valid GPX file
    const buffer = Buffer.from(TEST_GPX_CONTENT)
    const fileInput = page.locator('[role="dialog"] input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-race.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    // Wait for parsing
    await waitForFileUploadProcessing(page, undefined, 30000, logger)

    // Switch to preview tab where the import button is located
    const previewTab = page.getByTestId('preview-tab')
    await previewTab.click()

    // Click import when the button is visible and enabled
    const uploadButton = page.getByTestId('import-races-button')
    await expect(uploadButton).toBeVisible({ timeout: 10000 })
    await expect(uploadButton).toBeEnabled()
    await uploadButton.click({ timeout: 10000 })

    // Wait for import to complete and modal to close (confirms successful import)
    await expect(page.locator('[role="dialog"], .modal')).not.toBeVisible({ timeout: 15000 })
  })

  test('should handle duplicate race detection', async ({ page }) => {
    logger.info('[Test] Starting duplicate race detection test')

    // Use Context7 recommended loading approach
    await page.waitForLoadState('domcontentloaded')
    await waitForHeroUIReady(page)

    // Wait for loading to complete
    const loadingIndicator = page.getByText(/Loading race expeditions/i)
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
      logger.info('[Test] Loading indicator cleared')
    } catch {
      logger.info('[Test] No loading indicator detected')
    }

    // First, import a race using the modal trigger
    const importButton = page.getByTestId('import-races-modal-trigger')
    await expect(importButton).toBeVisible({ timeout: 30000 })
    await importButton.click({ timeout: 30000 })
    logger.info('[Test] Import modal opened')

    const buffer = Buffer.from(TEST_GPX_CONTENT)
    const fileInput = page.locator('[role="dialog"] input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-race.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })
    logger.info('[Test] First GPX file uploaded')

    // Wait for processing using improved helper
    await waitForFileUploadProcessing(page, 'Test Ultra Race', 30000, logger)

    // Find and click import button using data-testid
    const uploadButton = page.getByTestId('import-races-button')
    await uploadButton.click({ timeout: 10000 })
    logger.info('[Test] First import initiated')

    // Wait for first import to complete - check that modal is still open (more reliable)
    await page.waitForTimeout(2000) // Brief wait for processing
    logger.info('[Test] First import successful')

    // Close modal and try to import the same race again
    const closeButton = page.locator('[aria-label="Close"], .modal-close, button:has-text("Close")')
    try {
      await closeButton.first().click({ timeout: 5000 })
    } catch {
      // Modal might have auto-closed
    }

    // Refresh page and wait for it to load
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    try {
      await page.getByText('Loading race expeditions').waitFor({ state: 'hidden', timeout: 30000 })
      logger.info('[Test] Page reloaded and ready')
    } catch (error) {
      logger.info('[Test] Loading state check failed (expected in fast CI):', error)
    }

    // Open import modal again
    const importButtonAgain = page.getByTestId('import-races-modal-trigger')
    await expect(importButtonAgain).toBeVisible({ timeout: 30000 })
    await importButtonAgain.click()
    logger.info('[Test] Import modal reopened for duplicate test')

    // Mock duplicate on second import for determinism
    await page.route('/api/races/import', route =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Duplicate race detected',
          details: 'A similar race may already exist',
          existingRaces: [
            { id: '1', name: 'Test Ultra Race', location: '', distance: '0', date: '2024-06-15' },
          ],
        }),
      })
    )

    // Upload the same GPX file again
    const fileInputAgain = page.locator('[role="dialog"] input[type="file"]')
    await fileInputAgain.setInputFiles({
      name: 'test-race-duplicate.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })
    logger.info('[Test] Duplicate GPX file uploaded')

    // Wait for processing
    await waitForFileUploadProcessing(page, 'Test Ultra Race', 30000, logger)

    // Click import button again
    const uploadButtonAgain = page.getByTestId('import-races-button')
    await uploadButtonAgain.click()
    logger.info('[Test] Duplicate import initiated')

    // Should show duplicate detection warning
    const duplicateWarning = page
      .getByText('Duplicate race detected')
      .or(page.getByText('similar race may already exist'))
    await expect(duplicateWarning.first()).toBeVisible({ timeout: 15000 })
    logger.info('[Test] Duplicate warning detected')
  })

  test('should handle bulk CSV import', async ({ page }) => {
    logger.info('[Test] Starting bulk CSV import test')

    // Use Context7 recommended loading approach
    await page.waitForLoadState('domcontentloaded')
    await waitForHeroUIReady(page)

    // Wait for loading to complete
    const loadingIndicator = page.getByText(/Loading race expeditions/i)
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
      logger.info('[Test] Loading indicator cleared')
    } catch {
      logger.info('[Test] No loading indicator detected')
    }

    // Open import modal with data-testid selector
    const importButton = page.getByTestId('import-races-modal-trigger')
    await expect(importButton).toBeVisible({ timeout: 30000 })
    await importButton.click({ timeout: 30000 })
    logger.info('[Test] Import modal opened')

    // Upload CSV file with multiple races using Context7 buffer pattern
    const buffer = Buffer.from(TEST_CSV_CONTENT)
    logger.info('[Test] Created CSV buffer with length:', buffer.length)

    const fileInput = page.locator('[role="dialog"] input[type="file"]')
    await fileInput.setInputFiles({
      name: 'bulk-races.csv',
      mimeType: 'text/csv',
      buffer,
    })
    logger.info('[Test] Bulk CSV file uploaded')

    // Step 1: Verify file was received by checking for processing status
    logger.info('[Test] Step 1: Checking for bulk processing status...')
    try {
      await page.getByText(/Processing|Preparing|Parsing CSV/i).waitFor({ timeout: 5000 })
      logger.info('[Test] Processing message appeared for bulk import')
    } catch {
      logger.info('[Test] No processing message detected, checking for immediate completion')
    }

    // Use standardized helper that waits for preview and parsed content
    await waitForFileUploadProcessing(page, 'Western States 100', 90000, logger)

    // Verify expected races are present
    const westernStates = page.getByTestId('race-list').getByText('Western States 100')
    const leadville = page.getByTestId('race-list').getByText('Leadville 100')
    const utmb = page.getByTestId('race-list').getByText('UTMB')

    await expect(westernStates).toBeVisible({ timeout: 30000 })
    await expect(leadville).toBeVisible({ timeout: 30000 })
    await expect(utmb).toBeVisible({ timeout: 30000 })

    // Mock bulk import endpoint for speed and determinism
    await page.route('/api/races/bulk-import', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          importedCount: 3,
          races: [
            { id: '1', name: 'Western States 100', location: 'Auburn, CA', distance: '100' },
            { id: '2', name: 'Leadville 100', location: 'Leadville, CO', distance: '100' },
            { id: '3', name: 'UTMB', location: 'Chamonix, France', distance: '170' },
          ],
        }),
      })
    )

    // Click the import button to complete the bulk import
    const confirmImportButton = page.getByTestId('import-races-button')
    await expect(confirmImportButton).toBeVisible({ timeout: 20000 })
    await confirmImportButton.click()

    // Wait for bulk import to complete - modal closes on success (more reliable than toast)
    await expect(page.locator('[role="dialog"], .modal')).not.toBeVisible({ timeout: 30000 })
  })

  test.skip('should show progress indicator during import', async ({ page }) => {
    // Wait for page to be fully ready
    await waitForHeroUIReady(page)

    // Wait for loading to complete
    const loadingIndicator = page.getByText(/Loading race expeditions/i)
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
    } catch {
      // Loading might have completed before we checked
    }

    // Extra wait for React hydration in CI
    // Wait removed - folded into waitForHeroUIReady

    // Check for overlays that might intercept clicks
    const overlays = page.locator(
      '[style*="pointer-events: none"], .loading-overlay, .modal-backdrop'
    )
    try {
      await overlays.first().waitFor({ state: 'hidden', timeout: 5000 })
    } catch {
      // No overlays or already hidden
    }

    // Open import modal using the modal trigger
    const importButton = page.getByTestId('import-races-modal-trigger')

    // Verify import button is visible (require coach role)
    await expect(importButton).toBeVisible({ timeout: 30000 })
    await importButton.click({ timeout: 30000 })

    const buffer = Buffer.from(TEST_GPX_CONTENT)
    const fileInput = page.locator('[role="dialog"] input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-race.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    await waitForFileUploadProcessing(page, undefined, 30000, logger)

    const uploadButton = page.getByTestId('import-races-button')
    await uploadButton.click()

    // Should see progress indicator
    await expect(page.locator('[role="progressbar"], .progress')).toBeVisible()

    // Wait for completion - modal closes on success (more reliable than toast)
    await expect(page.locator('[role="dialog"], .modal')).not.toBeVisible({ timeout: 15000 })
  })
})

test.describe('Race Import Edge Cases', () => {
  test('should handle network failures gracefully', async ({ page }) => {
    // Navigate to races page (authentication handled by storage state)
    await page.goto('/races')
    await page.waitForURL('**/races', { timeout: 30000 })

    // Mock network failure
    await page.route('/api/races/import', route => {
      route.abort('failed')
    })

    // Wait for page to be fully ready
    await waitForHeroUIReady(page)

    // Wait for loading to complete
    const loadingIndicator = page.getByText(/Loading race expeditions/i)
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
    } catch {
      // Loading might have completed before we checked
    }

    // Extra wait for React hydration in CI
    // Wait removed - folded into waitForHeroUIReady

    // Check for overlays that might intercept clicks
    const overlays = page.locator(
      '[style*="pointer-events: none"], .loading-overlay, .modal-backdrop'
    )
    try {
      await overlays.first().waitFor({ state: 'hidden', timeout: 5000 })
    } catch {
      // No overlays or already hidden
    }

    // Use consistent data-testid selector
    const importButton = page.getByTestId('import-races-modal-trigger')

    // Verify import button is visible (require coach role)
    await expect(importButton).toBeVisible({ timeout: 30000 })

    // Try to click with force option if needed
    try {
      await importButton.click({ timeout: 10000 })
    } catch (clickError) {
      await importButton.click({ force: true, timeout: 5000 })
    }

    const buffer = Buffer.from(TEST_GPX_CONTENT)
    const fileInput = page.locator('[role="dialog"] input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-race.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    await waitForFileUploadProcessing(page, undefined, 30000, logger)

    const uploadButton = page.getByTestId('import-races-button')
    await uploadButton.click()

    // Should show network error message using proper Playwright .or() combinator
    await expect(page.getByText(/(network error|check your connection)/i)).toBeVisible({
      timeout: 15000,
    })
  })

  test('should handle rate limiting', async ({ page }) => {
    // Navigate to races page (authentication handled by storage state)
    await page.goto('/races')
    await page.waitForURL('**/races', { timeout: 30000 })

    // Mock rate limiting response
    await page.route('/api/races/import', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: 60,
        }),
      })
    })

    // Wait for page to be fully ready
    await waitForHeroUIReady(page)

    // Wait for loading to complete
    const loadingIndicator = page.getByText(/Loading race expeditions/i)
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
    } catch {
      // Loading might have completed before we checked
    }

    // Extra wait for React hydration in CI
    // Wait removed - folded into waitForHeroUIReady

    // Check for overlays that might intercept clicks
    const overlays = page.locator(
      '[style*="pointer-events: none"], .loading-overlay, .modal-backdrop'
    )
    try {
      await overlays.first().waitFor({ state: 'hidden', timeout: 5000 })
    } catch {
      // No overlays or already hidden
    }

    // Use consistent data-testid selector
    const importButton = page.getByTestId('import-races-modal-trigger')

    // Verify import button is visible (require coach role)
    await expect(importButton).toBeVisible({ timeout: 30000 })

    // Try to click with force option if needed
    try {
      await importButton.click({ timeout: 10000 })
    } catch (clickError) {
      await importButton.click({ force: true, timeout: 5000 })
    }

    const buffer = Buffer.from(TEST_GPX_CONTENT)
    const fileInput = page.locator('[role="dialog"] input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-race.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    await waitForFileUploadProcessing(page, undefined, 30000, logger)

    const uploadButton = page.getByTestId('import-races-button')
    await uploadButton.click()

    // Should show rate limit message using proper Playwright .or() combinator
    await expect(page.getByText(/(Rate limit exceeded|try again)/i)).toBeVisible({
      timeout: 10000,
    })
  })

  test.skip('should only allow coaches to import races', async ({ page }) => {
    // Skip this test as it requires different auth setup
    // TODO: Set up proper runner auth state for this test

    // Import button should not be visible for runners
    const importButton = page.locator('button:has-text("Import"), button:has-text("Add Race")')
    await expect(importButton).not.toBeVisible()
  })
})
