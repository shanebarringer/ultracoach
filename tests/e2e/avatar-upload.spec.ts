import { expect, test } from '@playwright/test'
import path from 'path'

// TODO: Enable these tests after adding test fixtures and data-testids
// These tests require:
// - tests/fixtures/test-avatar.jpg (valid image file)
// - tests/fixtures/large-file.jpg (6MB+ file for testing size limits)
// - tests/fixtures/test-document.pdf (invalid file type)
// - data-testid attributes in components
test.describe.skip('Avatar Upload', () => {
  test.use({ storageState: './playwright/.auth/coach.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')
  })

  test('should successfully upload a new avatar', async ({ page }) => {
    // Locate avatar upload button
    const avatarButton = page.getByRole('button', { name: /upload profile picture/i })
    await expect(avatarButton).toBeVisible()

    // Prepare test image
    const testImagePath = path.join(__dirname, '../fixtures/test-avatar.jpg')

    // Set up file input listener
    const fileChooserPromise = page.waitForEvent('filechooser')
    await avatarButton.click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(testImagePath)

    // Wait for upload to complete
    await page.waitForSelector('[data-testid="avatar-upload-success"]', {
      timeout: 10000,
    })

    // Verify success message
    await expect(page.getByText(/avatar uploaded successfully/i)).toBeVisible()

    // Verify new avatar is displayed
    const avatarImage = page.locator('img[alt="Profile avatar"]')
    await expect(avatarImage).toBeVisible()

    // Verify image loaded correctly
    await expect(avatarImage).toHaveAttribute('src', /storage.*avatars/)
  })

  test('should reject files larger than 5MB', async ({ page }) => {
    const avatarButton = page.getByRole('button', { name: /upload profile picture/i })

    // Attempt to upload large file
    const largeFilePath = path.join(__dirname, '../fixtures/large-file.jpg') // 6MB file

    const fileChooserPromise = page.waitForEvent('filechooser')
    await avatarButton.click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(largeFilePath)

    // Verify error message
    await expect(page.getByText(/file size must be less than 5mb/i)).toBeVisible()
  })

  test('should reject invalid file types', async ({ page }) => {
    const avatarButton = page.getByRole('button', { name: /upload profile picture/i })

    // Attempt to upload invalid file type (PDF)
    const invalidFilePath = path.join(__dirname, '../fixtures/test-document.pdf')

    const fileChooserPromise = page.waitForEvent('filechooser')
    await avatarButton.click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(invalidFilePath)

    // Verify error message
    await expect(page.getByText(/invalid file type|only image files are allowed/i)).toBeVisible()
  })

  test('should successfully remove avatar', async ({ page }) => {
    // First, ensure avatar exists (skip if no avatar)
    const removeButton = page.getByRole('button', { name: /remove avatar/i })
    const hasAvatar = await removeButton.isVisible()

    if (!hasAvatar) {
      test.skip('No avatar to remove')
      return
    }

    // Click remove button
    await removeButton.click()

    // Confirm removal in dialog
    await page.getByRole('button', { name: /confirm/i }).click()

    // Wait for removal to complete
    await page.waitForResponse(response => response.url().includes('/api/upload/avatar'))

    // Verify success message
    await expect(page.getByText(/avatar removed successfully/i)).toBeVisible()

    // Verify avatar is replaced with initials
    await expect(page.locator('[data-testid="avatar-initials"]')).toBeVisible()
  })

  test('should enforce rate limiting after 10 uploads', async ({ page }) => {
    const avatarButton = page.getByRole('button', { name: /upload profile picture/i })
    const testImagePath = path.join(__dirname, '../fixtures/test-avatar.jpg')

    // Perform 10 successful uploads
    for (let i = 0; i < 10; i++) {
      const fileChooserPromise = page.waitForEvent('filechooser')
      await avatarButton.click()
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles(testImagePath)

      await page.waitForSelector('[data-testid="avatar-upload-success"]', {
        timeout: 10000,
      })

      // Small delay between uploads
      await page.waitForTimeout(500)
    }

    // 11th upload should be rate limited
    const fileChooserPromise = page.waitForEvent('filechooser')
    await avatarButton.click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(testImagePath)

    // Verify rate limit error
    await expect(page.getByText(/too many upload attempts/i)).toBeVisible()
    await expect(page.getByText(/please try again/i)).toBeVisible()
  })

  test('should display upload progress indicator', async ({ page }) => {
    const avatarButton = page.getByRole('button', { name: /upload profile picture/i })
    const testImagePath = path.join(__dirname, '../fixtures/test-avatar.jpg')

    const fileChooserPromise = page.waitForEvent('filechooser')
    await avatarButton.click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(testImagePath)

    // Verify loading spinner appears during upload
    await expect(page.locator('[data-testid="upload-spinner"]')).toBeVisible()

    // Wait for upload to complete
    await page.waitForSelector('[data-testid="avatar-upload-success"]', {
      timeout: 10000,
    })

    // Verify spinner disappears
    await expect(page.locator('[data-testid="upload-spinner"]')).not.toBeVisible()
  })

  test('should maintain aspect ratio for uploaded images', async ({ page }) => {
    const avatarButton = page.getByRole('button', { name: /upload profile picture/i })
    const testImagePath = path.join(__dirname, '../fixtures/test-avatar.jpg')

    const fileChooserPromise = page.waitForEvent('filechooser')
    await avatarButton.click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(testImagePath)

    await page.waitForSelector('[data-testid="avatar-upload-success"]', {
      timeout: 10000,
    })

    // Verify image is displayed as a circle (aspect ratio 1:1)
    const avatarImage = page.locator('img[alt="Profile avatar"]')
    const boundingBox = await avatarImage.boundingBox()

    expect(boundingBox).toBeTruthy()
    if (boundingBox) {
      // Allow 2px tolerance for rounding
      expect(Math.abs(boundingBox.width - boundingBox.height)).toBeLessThanOrEqual(2)
    }
  })

  test('should keyboard navigate avatar upload', async ({ page }) => {
    // Tab to avatar button
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab') // Adjust based on page structure

    // Verify avatar button is focused
    const avatarButton = page.getByRole('button', { name: /upload profile picture/i })
    await expect(avatarButton).toBeFocused()

    // Press Enter to trigger file picker
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.keyboard.press('Enter')
    const fileChooser = await fileChooserPromise

    // Verify file chooser opened
    expect(fileChooser).toBeTruthy()
  })
})

test.describe.skip('Avatar Storage Cleanup', () => {
  test.use({ storageState: './playwright/.auth/coach.json' })

  test('should keep only 3 most recent avatars', async ({ page, request }) => {
    // This test verifies the backend cleanup logic
    // Upload 5 avatars and verify only 3 remain in storage

    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    const avatarButton = page.getByRole('button', { name: /upload profile picture/i })
    const testImagePath = path.join(__dirname, '../fixtures/test-avatar.jpg')

    // Upload 5 avatars
    for (let i = 0; i < 5; i++) {
      const fileChooserPromise = page.waitForEvent('filechooser')
      await avatarButton.click()
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles(testImagePath)

      await page.waitForSelector('[data-testid="avatar-upload-success"]', {
        timeout: 10000,
      })

      // Wait between uploads to ensure different timestamps
      await page.waitForTimeout(1500)
    }

    // Verify via API that only 3 avatars exist
    const session = await page.context().storageState()
    const cookies = session.cookies

    const response = await request.get('/api/profile/avatars/count', {
      headers: {
        cookie: cookies.map(c => `${c.name}=${c.value}`).join('; '),
      },
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.count).toBeLessThanOrEqual(3)
  })
})
