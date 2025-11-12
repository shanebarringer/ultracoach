import { expect, test } from '@playwright/test'

import { waitForHeroUIReady } from './utils/heroui-helpers'
import { waitForFileUploadProcessing } from './utils/suspense-helpers'
import { type TestLogger, getTestLogger } from './utils/test-logger'

let logger: TestLogger
test.beforeAll(async () => {
  logger = await getTestLogger('tests/race-import-runner.spec')
})

const TEST_GPX_CONTENT = `<?xml version="1.0"?>
<gpx version="1.1" creator="TestCreator">
  <metadata>
    <name>Runner Test Ultra</name>
    <desc>Runner test race for import</desc>
  </metadata>
  <trk>
    <name>Runner Ultra Track</name>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194"><ele>100</ele><time>2024-06-15T08:00:00Z</time></trkpt>
      <trkpt lat="37.7754" lon="-122.4189"><ele>105</ele><time>2024-06-15T08:01:00Z</time></trkpt>
      <trkpt lat="37.7759" lon="-122.4184"><ele>110</ele><time>2024-06-15T08:02:00Z</time></trkpt>
      <trkpt lat="37.7764" lon="-122.4179"><ele>115</ele><time>2024-06-15T08:03:00Z</time></trkpt>
      <trkpt lat="37.7769" lon="-122.4174"><ele>120</ele><time>2024-06-15T08:04:00Z</time></trkpt>
      <trkpt lat="37.7774" lon="-122.4169"><ele>125</ele><time>2024-06-15T08:05:00Z</time></trkpt>
      <trkpt lat="37.7779" lon="-122.4164"><ele>130</ele><time>2024-06-15T08:06:00Z</time></trkpt>
      <trkpt lat="37.7784" lon="-122.4159"><ele>135</ele><time>2024-06-15T08:07:00Z</time></trkpt>
      <trkpt lat="37.7789" lon="-122.4154"><ele>140</ele><time>2024-06-15T08:08:00Z</time></trkpt>
      <trkpt lat="37.7794" lon="-122.4149"><ele>145</ele><time>2024-06-15T08:09:00Z</time></trkpt>
      <trkpt lat="37.7799" lon="-122.4144"><ele>150</ele><time>2024-06-15T08:10:00Z</time></trkpt>
      <trkpt lat="37.7804" lon="-122.4139"><ele>155</ele><time>2024-06-15T08:11:00Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>`

const TEST_CSV_CONTENT = `Name,Date,Location,Distance (miles),Distance Type,Elevation Gain (ft),Terrain,Website,Notes
"Javelina Jundred","2024-10-26","Fountain Hills, AZ",100,100M,6000,trail,"https://www.aravaiparunning.com/races/javelina-jundred/","Desert 100 miler"`

test.describe('Runner race import capabilities', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate with runner storageState; see playwright.config.ts project
    await page.goto('/races')
    await page.waitForURL('**/races', { timeout: 30000 })
  })

  test('runner can open import modal and import a GPX (mocked API)', async ({ page }) => {
    await waitForHeroUIReady(page)

    // Runner should see the same Import button
    const importButton = page.getByTestId('import-races-modal-trigger')
    await expect(importButton).toBeVisible({ timeout: 15000 })
    await importButton.click()

    // Upload GPX and wait for preview
    const buffer = Buffer.from(TEST_GPX_CONTENT)
    const fileInput = page.locator('[role="dialog"] input[type="file"]')
    await fileInput.setInputFiles({
      name: 'runner-test.gpx',
      mimeType: 'application/gpx+xml',
      buffer,
    })

    await waitForFileUploadProcessing(page, 'Runner Test Ultra', 60000, logger)

    // Mock the import API to avoid DB dependency and speed up CI
    await page.route('/api/races/import', route =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          race: {
            id: 'r-1',
            name: 'Runner Test Ultra',
            date: '2024-06-15T08:00:00Z',
            distance_miles: '31.0',
            distance_type: '50K',
            location: '37.7749, -122.4194',
            elevation_gain_feet: 2000,
            terrain_type: 'trail',
            website_url: null,
            notes: 'Imported from GPX',
            created_by: 'runner-user-id',
          },
          message: 'Race imported successfully',
        }),
      })
    )

    // Switch to preview and click Import
    await page.getByTestId('preview-tab').click()
    const confirm = page.getByTestId('import-races-button')
    await expect(confirm).toBeVisible()
    await confirm.click()

    // Modal closes on success
    await expect(page.locator('[role="dialog"], .modal')).not.toBeVisible({ timeout: 15000 })
  })

  test('runner can bulk import via CSV (mocked API)', async ({ page }) => {
    await waitForHeroUIReady(page)

    const importButton = page.getByTestId('import-races-modal-trigger')
    await expect(importButton).toBeVisible({ timeout: 15000 })
    await importButton.click()

    const buffer = Buffer.from(TEST_CSV_CONTENT)
    const fileInput = page.locator('[role="dialog"] input[type="file"]')
    await fileInput.setInputFiles({ name: 'runner-bulk.csv', mimeType: 'text/csv', buffer })

    await waitForFileUploadProcessing(page, 'Javelina Jundred', 60000, logger)

    // Verify preview list shows the race
    await expect(page.getByTestId('race-list').getByText('Javelina Jundred')).toBeVisible()

    // Mock bulk import endpoint
    await page.route('/api/races/bulk-import', route =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: { totalRequested: 1, successful: 1, duplicates: 0, errors: 0 },
          results: [{ success: true }],
          insertedRaces: [
            {
              id: 'r-2',
              name: 'Javelina Jundred',
              date: '2024-10-26T00:00:00Z',
              distance_miles: '100',
              distance_type: '100M',
              location: 'Fountain Hills, AZ',
              elevation_gain_feet: 6000,
              terrain_type: 'trail',
              website_url: 'https://www.aravaiparunning.com/races/javelina-jundred/',
              notes: 'Desert 100 miler',
              created_by: 'runner-user-id',
            },
          ],
          message: 'Bulk import completed',
        }),
      })
    )

    const confirm = page.getByTestId('import-races-button')
    await expect(confirm).toBeVisible()
    await confirm.click()

    // Modal closes on success
    await expect(page.locator('[role="dialog"], .modal')).not.toBeVisible({ timeout: 15000 })
  })
})
