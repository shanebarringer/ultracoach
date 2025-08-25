import { expect, test } from '@playwright/test'

import { type TestUserType, loginAsUser } from './utils/test-helpers'

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
      <trkpt lat="37.7849" lon="-122.4094">
        <ele>150</ele>
        <time>2024-06-15T08:15:00Z</time>
      </trkpt>
      <trkpt lat="37.7949" lon="-122.3994">
        <ele>200</ele>
        <time>2024-06-15T08:30:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
  <wpt lat="37.7749" lon="-122.4194">
    <name>Start</name>
    <desc>Race start line</desc>
    <ele>100</ele>
  </wpt>
  <wpt lat="37.7949" lon="-122.3994">
    <name>Finish</name>
    <desc>Race finish line</desc>
    <ele>200</ele>
  </wpt>
</gpx>`

const TEST_CSV_CONTENT = `Name,Date,Location,Distance (miles),Distance Type,Elevation Gain (ft),Terrain,Website,Notes
"Western States 100","2024-06-29","Auburn, CA",100,100M,18000,trail,"https://wser.org","Premier 100-mile trail race"
"Leadville 100","2024-08-17","Leadville, CO",100,100M,15600,mountain,"https://leadvilleraceseries.com","High altitude mountain race"
"UTMB","2024-08-30","Chamonix, France",103,Custom,32000,mountain,"https://utmb.world","Ultra Trail du Mont Blanc"`

test.describe('Race Import Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'coach')
    await page.goto('/races')
  })

  test('should open race import modal', async ({ page }) => {
    // Look for import button or similar trigger
    const importButton = page.locator('button:has-text("Import"), button:has-text("Add Race")')
    await expect(importButton.first()).toBeVisible()

    await importButton.first().click()

    // Check if modal opened
    await expect(page.locator('[role="dialog"], .modal')).toBeVisible()
  })

  test('should handle GPX file upload', async ({ page }) => {
    // Open import modal
    const importButton = page.locator('button:has-text("Import"), button:has-text("Add Race")')
    await importButton.first().click()

    // Create a test GPX file
    const buffer = Buffer.from(TEST_GPX_CONTENT)

    // Look for file upload input
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeVisible()

    // Upload the test file
    await fileInput.setInputFiles({
      name: 'test-race.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    // Wait for file to be processed
    await page.waitForTimeout(2000)

    // Check if race data was parsed
    await expect(page.locator('text=Test Ultra Race')).toBeVisible()
  })

  test('should handle CSV file upload', async ({ page }) => {
    // Open import modal
    const importButton = page.locator('button:has-text("Import"), button:has-text("Add Race")')
    await importButton.first().click()

    // Create a test CSV file
    const buffer = Buffer.from(TEST_CSV_CONTENT)

    // Look for file upload input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-races.csv',
      mimeType: 'text/csv',
      buffer,
    })

    // Wait for file to be processed
    await page.waitForTimeout(3000)

    // Check if races were parsed (should see multiple races)
    await expect(page.locator('text=Western States 100')).toBeVisible()
    await expect(page.locator('text=Leadville 100')).toBeVisible()
    await expect(page.locator('text=UTMB')).toBeVisible()
  })

  test('should validate file size limits', async ({ page }) => {
    // Open import modal
    const importButton = page.locator('button:has-text("Import"), button:has-text("Add Race")')
    await importButton.first().click()

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
    await expect(page.locator('text=File size exceeds, text=too large')).toBeVisible()
  })

  test('should handle invalid GPX files', async ({ page }) => {
    // Open import modal
    const importButton = page.locator('button:has-text("Import"), button:has-text("Add Race")')
    await importButton.first().click()

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

    // Should show parse error
    await expect(page.locator('text=Failed to parse, text=Invalid GPX')).toBeVisible()
  })

  test('should successfully import single race', async ({ page }) => {
    // Open import modal
    const importButton = page.locator('button:has-text("Import"), button:has-text("Add Race")')
    await importButton.first().click()

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

    // Find and click import/upload button
    const uploadButton = page.locator('button:has-text("Import"), button:has-text("Upload")')
    await uploadButton.click()

    // Should see success message
    await expect(page.locator('text=successfully imported, text=Import successful')).toBeVisible({
      timeout: 10000,
    })

    // Modal should close
    await expect(page.locator('[role="dialog"], .modal')).not.toBeVisible({ timeout: 5000 })
  })

  test('should handle duplicate race detection', async ({ page }) => {
    // First, import a race
    const importButton = page.locator('button:has-text("Import"), button:has-text("Add Race")')
    await importButton.first().click()

    const buffer = Buffer.from(TEST_GPX_CONTENT)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-race.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    await page.waitForTimeout(2000)

    const uploadButton = page.locator('button:has-text("Import"), button:has-text("Upload")')
    await uploadButton.click()

    // Wait for first import to complete
    await expect(page.locator('text=successfully imported, text=Import successful')).toBeVisible({
      timeout: 10000,
    })

    // Try to import the same race again
    await page.reload()
    await importButton.first().click()

    await fileInput.setInputFiles({
      name: 'test-race-duplicate.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    await page.waitForTimeout(2000)
    await uploadButton.click()

    // Should show duplicate detection warning
    await expect(
      page.locator('text=Duplicate race, text=similar race may already exist')
    ).toBeVisible({ timeout: 10000 })
  })

  test('should handle bulk CSV import', async ({ page }) => {
    // Open import modal
    const importButton = page.locator('button:has-text("Import"), button:has-text("Add Race")')
    await importButton.first().click()

    // Upload CSV file with multiple races
    const buffer = Buffer.from(TEST_CSV_CONTENT)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'bulk-races.csv',
      mimeType: 'text/csv',
      buffer,
    })

    await page.waitForTimeout(3000)

    // Should see multiple races parsed
    await expect(page.locator('text=3 race')).toBeVisible() // "3 races from 1 file" or similar

    const uploadButton = page.locator('button:has-text("Import"), button:has-text("Upload")')
    await uploadButton.click()

    // Should see bulk import success message
    await expect(page.locator('text=Bulk import completed, text=successful')).toBeVisible({
      timeout: 15000,
    })
  })

  test('should show progress indicator during import', async ({ page }) => {
    // Open import modal
    const importButton = page.locator('button:has-text("Import"), button:has-text("Add Race")')
    await importButton.first().click()

    const buffer = Buffer.from(TEST_GPX_CONTENT)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-race.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    await page.waitForTimeout(2000)

    const uploadButton = page.locator('button:has-text("Import"), button:has-text("Upload")')
    await uploadButton.click()

    // Should see progress indicator
    await expect(page.locator('[role="progressbar"], .progress')).toBeVisible()

    // Wait for completion
    await expect(page.locator('text=successfully imported, text=Import successful')).toBeVisible({
      timeout: 10000,
    })
  })
})

test.describe('Race Import Edge Cases', () => {
  test('should handle network failures gracefully', async ({ page }) => {
    await loginAsUser(page, 'coach')
    await page.goto('/races')

    // Mock network failure
    await page.route('/api/races/import', route => {
      route.abort('failed')
    })

    const importButton = page.locator('button:has-text("Import"), button:has-text("Add Race")')
    await importButton.first().click()

    const buffer = Buffer.from(TEST_GPX_CONTENT)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-race.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    await page.waitForTimeout(2000)

    const uploadButton = page.locator('button:has-text("Import"), button:has-text("Upload")')
    await uploadButton.click()

    // Should show network error message
    await expect(page.locator('text=network error, text=check your connection')).toBeVisible({
      timeout: 15000,
    })
  })

  test('should handle rate limiting', async ({ page }) => {
    await loginAsUser(page, 'coach')
    await page.goto('/races')

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

    const importButton = page.locator('button:has-text("Import"), button:has-text("Add Race")')
    await importButton.first().click()

    const buffer = Buffer.from(TEST_GPX_CONTENT)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-race.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    await page.waitForTimeout(2000)

    const uploadButton = page.locator('button:has-text("Import"), button:has-text("Upload")')
    await uploadButton.click()

    // Should show rate limit message
    await expect(page.locator('text=Rate limit exceeded, text=try again')).toBeVisible({
      timeout: 10000,
    })
  })

  test('should only allow coaches to import races', async ({ page }) => {
    // Login as runner instead of coach
    await loginAsUser(page, 'runner')
    await page.goto('/races')

    // Import button should not be visible for runners
    const importButton = page.locator('button:has-text("Import"), button:has-text("Add Race")')
    await expect(importButton).not.toBeVisible()
  })
})
