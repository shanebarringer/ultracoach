import { expect, test } from '@playwright/test'
import { Logger } from 'tslog'

import { waitForHeroUIReady } from './utils/heroui-helpers'
import { waitForFileUploadProcessing } from './utils/suspense-helpers'
import { type TestUserType, navigateToDashboard } from './utils/test-helpers'

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

    // Verify storage state was loaded
    const storageState = await context.storageState()

    // Check if we have auth cookies
    const cookies = await context.cookies()

    // Log specific auth cookies for debugging
    const authCookies = cookies.filter(
      c =>
        c.name.includes('auth') ||
        c.name.includes('session') ||
        c.name === 'better-auth.session_token'
    )

    // Auth cookies check removed - handled by test failures if auth is broken

    // First go to the home page to ensure cookies are set
    await page.goto('/')

    // Check cookies again after navigation
    const cookiesAfterHome = await context.cookies()

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
      // Debug the auth issue more thoroughly
      const finalCookies = await page.context().cookies()

      // Try to check if the page has any error messages
      const errorText = await page.textContent('body').catch(() => 'Could not get page text')

      throw new Error(`Authentication failed - redirected to signin: ${currentUrl}`)
    }

    // Wait for loading to complete if we're on the races page
    const loadingIndicator = page.locator('text=Loading race expeditions')
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
    } catch (error) {
      logger.debug('Loading state check failed (expected in fast CI):', { error: String(error) })
    }
  })

  test('should open race import modal', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForTimeout(2000) // Extra wait for CI

    // Look for import button with multiple possible selectors
    const importButton = page
      .locator('button:has-text("Import Races")')
      .or(page.getByTestId('import-races-button'))
      .or(page.locator('button').filter({ hasText: /import/i }))

    // Check if button is visible (might require coach role)
    // Verify import button is visible (require coach role)
    await expect(importButton).toBeVisible({ timeout: 30000 })

    await expect(importButton).toBeVisible({ timeout: 15000 })
    await importButton.click()

    // Check if modal opened
    await expect(page.locator('[role="dialog"], .modal')).toBeVisible({ timeout: 10000 })
  })

  test('should handle GPX file upload', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForTimeout(2000) // Extra wait for CI

    // Wait for loading to complete
    const loadingIndicator = page.locator('text=Loading race expeditions')
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
    const fileInput = page.locator('input[type="file"]')

    // Set files directly without checking visibility (file inputs are often hidden)
    await fileInput.setInputFiles({
      name: 'test-race.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    // Wait for file processing to complete using Suspense-aware helper
    await waitForFileUploadProcessing(page, 'Test Ultra Race', 90000)

    // Wait for parsing to complete - fail test if parse error occurs
    // Check for parse error and fail test to catch regressions
    const parseError = page.locator('text="Parse failed"').first()
    const hasParseError = await parseError.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasParseError) {
      // Get error details for debugging
      const errorDetails = await page
        .locator('text=/Failed to parse/i')
        .first()
        .textContent()
        .catch(() => 'Unknown parse error')

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

  test.skip('should handle CSV file upload', async ({ page }) => {
    console.log('[Test] Starting CSV file upload test')

    // Use domcontentloaded instead of timeout per Context7 recommendations
    await page.waitForLoadState('domcontentloaded')

    // Wait for loading to complete using specific data-testid
    const loadingIndicator = page.locator('text=Loading race expeditions')
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
      console.log('[Test] Loading indicator cleared')
    } catch {
      console.log('[Test] No loading indicator detected')
    }

    // Open import modal with data-testid selector
    const importButton = page.getByTestId('import-races-modal-trigger')
    await expect(importButton).toBeVisible({ timeout: 30000 })
    console.log('[Test] Import button visible')

    await importButton.click({ timeout: 30000 })
    console.log('[Test] Import modal opened')

    // Create a test CSV file using Context7 buffer upload pattern
    const buffer = Buffer.from(TEST_CSV_CONTENT)
    console.log('[Test] Created CSV buffer with content length:', buffer.length)

    // Look for file upload input and set files with proper validation
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-races.csv',
      mimeType: 'text/csv',
      buffer,
    })
    console.log('[Test] File input set with CSV buffer')

    // Step 1: Verify file was received by checking for processing message
    console.log('[Test] Step 1: Checking for processing status...')
    try {
      await page.locator('text=/Processing|Preparing|Parsing/i').waitFor({ timeout: 5000 })
      console.log('[Test] Processing message appeared')
    } catch {
      console.log('[Test] No processing message detected, checking for immediate completion')
    }

    // Step 2: Wait for Papa.parse to complete and data to be set
    console.log('[Test] Step 2: Waiting for CSV parsing completion...')
    const previewTab = page.getByTestId('preview-tab')
    await expect(previewTab).toBeVisible({ timeout: 10000 })
    await expect(previewTab).toHaveAttribute('aria-selected', 'true', { timeout: 15000 })
    console.log('[Test] Preview tab automatically selected after parsing')

    // Step 3: Verify content is loaded in preview area
    console.log('[Test] Step 3: Verifying parsed content is displayed...')
    const previewContent = page.getByTestId('preview-content')
    await previewContent.waitFor({ state: 'visible', timeout: 15000 })

    const raceList = page.getByTestId('race-list')
    await raceList.waitFor({ state: 'visible', timeout: 15000 })
    console.log('[Test] Race list container visible')

    // Step 4: Check for specific race names using data-testid selectors
    console.log('[Test] Step 4: Checking for specific race content...')
    const firstRaceElement = page.getByTestId('race-name-0')
    await firstRaceElement.waitFor({ state: 'visible', timeout: 15000 })

    const firstRaceText = await firstRaceElement.textContent()
    console.log('[Test] First race element text:', firstRaceText)

    // Verify expected races are present
    const westernStates = page.getByTestId('race-name-0').filter({ hasText: 'Western States 100' })
    const leadville = page.getByTestId('race-list').getByText('Leadville 100')
    const utmb = page.getByTestId('race-list').getByText('UTMB')

    await expect(westernStates).toBeVisible({ timeout: 15000 })
    await expect(leadville).toBeVisible({ timeout: 15000 })
    await expect(utmb).toBeVisible({ timeout: 15000 })

    console.log('[Test] All race names verified successfully')
  })

  test('should validate file size limits', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForTimeout(2000) // Extra wait for CI

    // Wait for loading to complete
    const loadingIndicator = page.locator('text=Loading race expeditions')
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

    const fileInput = page.locator('input[type="file"]')
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
    const loadingIndicator = page.locator('text=Loading race expeditions')
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
    } catch {
      // Loading might have completed before we checked
    }

    // Extra wait for React hydration in CI
    await page.waitForTimeout(process.env.CI ? 3000 : 1000)

    // Check for overlays that might intercept clicks
    const overlays = page.locator(
      '[style*="pointer-events: none"], .loading-overlay, .modal-backdrop'
    )
    try {
      await overlays.first().waitFor({ state: 'hidden', timeout: 5000 })
    } catch {
      // No overlays or already hidden
    }

    // Open import modal with multiple strategies
    const importButton = page
      .locator('button:has-text("Import Races")')
      .or(page.getByTestId('import-races-button'))
      .or(page.locator('button').filter({ hasText: /import/i }))

    // Check if button is visible (might require coach role)
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

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'invalid.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    // Wait for processing
    await page.waitForTimeout(2000)

    // Should show parse error using proper Playwright .or() combinator
    const parseError = page.getByText('Failed to parse').or(page.getByText('Invalid GPX'))
    await expect(parseError).toBeVisible()
  })

  test('should successfully import single race', async ({ page }) => {
    // Wait for page to be fully ready
    await waitForHeroUIReady(page)

    // Wait for loading to complete
    const loadingIndicator = page.locator('text=Loading race expeditions')
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
    } catch {
      // Loading might have completed before we checked
    }

    // Extra wait for React hydration in CI
    await page.waitForTimeout(process.env.CI ? 3000 : 1000)

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
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-race.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    // Wait for parsing
    await page.waitForTimeout(2000)

    // Switch to preview tab where the import button is located
    const previewTab = page.getByTestId('preview-tab')
    await previewTab.click()

    // Wait for preview content to load
    await page.waitForTimeout(1000)

    // Find and click import button using data-testid
    const uploadButton = page.getByTestId('import-races-button')
    await uploadButton.click({ timeout: 10000 })

    // Should see success message using proper Playwright .or() combinator
    const successMessage = page
      .getByText('successfully imported')
      .or(page.getByText('Import successful'))
    await expect(successMessage.first()).toBeVisible({
      timeout: 10000,
    })

    // Modal should close
    await expect(page.locator('[role="dialog"], .modal')).not.toBeVisible({ timeout: 5000 })
  })

  test.skip('should handle duplicate race detection', async ({ page }) => {
    console.log('[Test] Starting duplicate race detection test')

    // Use Context7 recommended loading approach
    await page.waitForLoadState('domcontentloaded')
    await waitForHeroUIReady(page)

    // Wait for loading to complete
    const loadingIndicator = page.locator('text=Loading race expeditions')
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
      console.log('[Test] Loading indicator cleared')
    } catch {
      console.log('[Test] No loading indicator detected')
    }

    // First, import a race using the modal trigger
    const importButton = page.getByTestId('import-races-modal-trigger')
    await expect(importButton).toBeVisible({ timeout: 30000 })
    await importButton.click({ timeout: 30000 })
    console.log('[Test] Import modal opened')

    const buffer = Buffer.from(TEST_GPX_CONTENT)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-race.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })
    console.log('[Test] First GPX file uploaded')

    // Wait for processing using improved helper
    await waitForFileUploadProcessing(page, 'Test Ultra Race', 30000)

    // Find and click import button using data-testid
    const uploadButton = page.getByTestId('import-races-button')
    await uploadButton.click({ timeout: 10000 })
    console.log('[Test] First import initiated')

    // Wait for first import to complete using specific toast messages
    const firstImportSuccess = page
      .getByText('Import successful')
      .or(page.getByText('races imported successfully'))
    await expect(firstImportSuccess.first()).toBeVisible({ timeout: 15000 })
    console.log('[Test] First import successful')

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
      await page
        .locator('text=Loading race expeditions')
        .waitFor({ state: 'hidden', timeout: 30000 })
      console.log('[Test] Page reloaded and ready')
    } catch (error) {
      console.log('[Test] Loading state check failed (expected in fast CI):', error)
    }

    // Open import modal again
    const importButtonAgain = page.getByTestId('import-races-modal-trigger')
    await expect(importButtonAgain).toBeVisible({ timeout: 30000 })
    await importButtonAgain.click()
    console.log('[Test] Import modal reopened for duplicate test')

    // Upload the same GPX file again
    const fileInputAgain = page.locator('input[type="file"]')
    await fileInputAgain.setInputFiles({
      name: 'test-race-duplicate.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })
    console.log('[Test] Duplicate GPX file uploaded')

    // Wait for processing
    await waitForFileUploadProcessing(page, 'Test Ultra Race', 30000)

    // Click import button again
    const uploadButtonAgain = page.getByTestId('import-races-button')
    await uploadButtonAgain.click()
    console.log('[Test] Duplicate import initiated')

    // Should show duplicate detection warning
    const duplicateWarning = page
      .getByText('Duplicate race detected')
      .or(page.getByText('similar race may already exist'))
    await expect(duplicateWarning.first()).toBeVisible({ timeout: 15000 })
    console.log('[Test] Duplicate warning detected')
  })

  test.skip('should handle bulk CSV import', async ({ page }) => {
    console.log('[Test] Starting bulk CSV import test')

    // Use Context7 recommended loading approach
    await page.waitForLoadState('domcontentloaded')
    await waitForHeroUIReady(page)

    // Wait for loading to complete
    const loadingIndicator = page.locator('text=Loading race expeditions')
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
      console.log('[Test] Loading indicator cleared')
    } catch {
      console.log('[Test] No loading indicator detected')
    }

    // Open import modal with data-testid selector
    const importButton = page.getByTestId('import-races-modal-trigger')
    await expect(importButton).toBeVisible({ timeout: 30000 })
    await importButton.click({ timeout: 30000 })
    console.log('[Test] Import modal opened')

    // Upload CSV file with multiple races using Context7 buffer pattern
    const buffer = Buffer.from(TEST_CSV_CONTENT)
    console.log('[Test] Created CSV buffer with length:', buffer.length)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'bulk-races.csv',
      mimeType: 'text/csv',
      buffer,
    })
    console.log('[Test] Bulk CSV file uploaded')

    // Step 1: Verify file was received by checking for processing status
    console.log('[Test] Step 1: Checking for bulk processing status...')
    try {
      await page.locator('text=/Processing|Preparing|Parsing CSV/i').waitFor({ timeout: 5000 })
      console.log('[Test] Processing message appeared for bulk import')
    } catch {
      console.log('[Test] No processing message detected, checking for immediate completion')
    }

    // Step 2: Wait for CSV parsing to complete and preview tab activation
    console.log('[Test] Step 2: Waiting for bulk CSV parsing completion...')
    const previewTab = page.getByTestId('preview-tab')
    await expect(previewTab).toBeVisible({ timeout: 10000 })
    await expect(previewTab).toHaveAttribute('aria-selected', 'true', { timeout: 20000 })
    console.log('[Test] Preview tab automatically selected after bulk parsing')

    // Step 3: Verify content structure is loaded
    console.log('[Test] Step 3: Verifying bulk parsed content structure...')
    const previewContent = page.getByTestId('preview-content')
    await previewContent.waitFor({ state: 'visible', timeout: 15000 })

    const raceList = page.getByTestId('race-list')
    await raceList.waitFor({ state: 'visible', timeout: 15000 })
    console.log('[Test] Bulk race list container visible')

    // Step 4: Verify individual race elements are rendered
    console.log('[Test] Step 4: Checking for bulk CSV race content...')
    const firstRaceElement = page.getByTestId('race-name-0')
    await firstRaceElement.waitFor({ state: 'visible', timeout: 15000 })

    const firstRaceText = await firstRaceElement.textContent()
    console.log('[Test] First race in bulk import:', firstRaceText)

    // Verify all expected races are present
    const westernStates = page.getByTestId('race-name-0').filter({ hasText: 'Western States 100' })
    const leadville = page.getByTestId('race-list').getByText('Leadville 100')
    const utmb = page.getByTestId('race-list').getByText('UTMB')

    await expect(westernStates).toBeVisible({ timeout: 15000 })
    await expect(leadville).toBeVisible({ timeout: 15000 })
    await expect(utmb).toBeVisible({ timeout: 15000 })
    console.log('[Test] All races verified in bulk preview')

    // Click the import button to complete the bulk import
    const confirmImportButton = page.getByTestId('import-races-button')
    await expect(confirmImportButton).toBeVisible({ timeout: 10000 })
    await confirmImportButton.click()
    console.log('[Test] Bulk import initiated')

    // Should see bulk import success message
    const bulkImportSuccess = page
      .getByText('Bulk import completed')
      .or(page.getByText('races imported successfully'))
    await expect(bulkImportSuccess.first()).toBeVisible({ timeout: 20000 })
    console.log('[Test] Bulk import success message detected')
  })

  test('should show progress indicator during import', async ({ page }) => {
    // Wait for page to be fully ready
    await waitForHeroUIReady(page)

    // Wait for loading to complete
    const loadingIndicator = page.locator('text=Loading race expeditions')
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
    } catch {
      // Loading might have completed before we checked
    }

    // Extra wait for React hydration in CI
    await page.waitForTimeout(process.env.CI ? 3000 : 1000)

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
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-race.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    await page.waitForTimeout(2000)

    const uploadButton = page.getByTestId('import-races-button')
    await uploadButton.click()

    // Should see progress indicator
    await expect(page.locator('[role="progressbar"], .progress')).toBeVisible()

    // Wait for completion using proper Playwright .or() combinator
    const completionSuccess = page
      .getByText('successfully imported')
      .or(page.getByText('Import successful'))
    await expect(completionSuccess).toBeVisible({
      timeout: 10000,
    })
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
    const loadingIndicator = page.locator('text=Loading race expeditions')
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
    } catch {
      // Loading might have completed before we checked
    }

    // Extra wait for React hydration in CI
    await page.waitForTimeout(process.env.CI ? 3000 : 1000)

    // Check for overlays that might intercept clicks
    const overlays = page.locator(
      '[style*="pointer-events: none"], .loading-overlay, .modal-backdrop'
    )
    try {
      await overlays.first().waitFor({ state: 'hidden', timeout: 5000 })
    } catch {
      // No overlays or already hidden
    }

    // Open import modal with multiple strategies
    const importButton = page
      .locator('button:has-text("Import Races")')
      .or(page.getByTestId('import-races-button'))
      .or(page.locator('button').filter({ hasText: /import/i }))

    // Check if button is visible (might require coach role)
    // Verify import button is visible (require coach role)
    await expect(importButton).toBeVisible({ timeout: 30000 })

    // Try to click with force option if needed
    try {
      await importButton.click({ timeout: 10000 })
    } catch (clickError) {
      await importButton.click({ force: true, timeout: 5000 })
    }

    const buffer = Buffer.from(TEST_GPX_CONTENT)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-race.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    await page.waitForTimeout(2000)

    const uploadButton = page.getByTestId('import-races-button')
    await uploadButton.click()

    // Should show network error message using proper Playwright .or() combinator
    const networkError = page.getByText('network error').or(page.getByText('check your connection'))
    await expect(networkError).toBeVisible({
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
    const loadingIndicator = page.locator('text=Loading race expeditions')
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 })
    } catch {
      // Loading might have completed before we checked
    }

    // Extra wait for React hydration in CI
    await page.waitForTimeout(process.env.CI ? 3000 : 1000)

    // Check for overlays that might intercept clicks
    const overlays = page.locator(
      '[style*="pointer-events: none"], .loading-overlay, .modal-backdrop'
    )
    try {
      await overlays.first().waitFor({ state: 'hidden', timeout: 5000 })
    } catch {
      // No overlays or already hidden
    }

    // Open import modal with multiple strategies
    const importButton = page
      .locator('button:has-text("Import Races")')
      .or(page.getByTestId('import-races-button'))
      .or(page.locator('button').filter({ hasText: /import/i }))

    // Check if button is visible (might require coach role)
    // Verify import button is visible (require coach role)
    await expect(importButton).toBeVisible({ timeout: 30000 })

    // Try to click with force option if needed
    try {
      await importButton.click({ timeout: 10000 })
    } catch (clickError) {
      await importButton.click({ force: true, timeout: 5000 })
    }

    const buffer = Buffer.from(TEST_GPX_CONTENT)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-race.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    await page.waitForTimeout(2000)

    const uploadButton = page.getByTestId('import-races-button')
    await uploadButton.click()

    // Should show rate limit message using proper Playwright .or() combinator
    const rateLimitError = page.getByText('Rate limit exceeded').or(page.getByText('try again'))
    await expect(rateLimitError).toBeVisible({
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
