import { expect, test } from '@playwright/test'

import { assertAuthenticated, loginAsUser } from './utils/test-helpers'

test.describe('Dashboard Functionality', () => {

  test('runner dashboard should display training plans', async ({ page }) => {
    await loginAsUser(page, 'runner')
    await assertAuthenticated(page, 'runner')

    // Wait for dashboard to load and check for key navigation elements
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 })
    
    // Check for runner-specific navigation elements (use first() to avoid strict mode)
    await expect(page.locator('text=Dashboard').first()).toBeVisible()
    await expect(page.locator('text=My Training').first()).toBeVisible()
    await expect(page.locator('text=Workouts').first()).toBeVisible()
    
    // Verify we're still on the runner dashboard URL
    await expect(page).toHaveURL(/dashboard\/runner/)
  })

  test('coach dashboard should display runners', async ({ page }) => {
    await loginAsUser(page, 'coach')
    await assertAuthenticated(page, 'coach')

    // Wait for dashboard to load and check for key navigation elements
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 })
    
    // Check for coach-specific navigation elements (use first() to avoid strict mode)
    await expect(page.locator('text=Dashboard').first()).toBeVisible()
    await expect(page.locator('text=Runners').first()).toBeVisible()
    await expect(page.locator('text=Training Plans').first()).toBeVisible()
    
    // Verify we're still on the coach dashboard URL
    await expect(page).toHaveURL(/dashboard\/coach/)
  })

  test('should navigate to training plans page', async ({ page }) => {
    await loginAsUser(page, 'runner')
    await assertAuthenticated(page, 'runner')

    // Wait for navigation to be available
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 })
    
    // Click on "My Training" navigation link (which should lead to training plans)
    await page.click('text=My Training')

    // Should navigate to weekly planner (that's where "My Training" link goes)
    await expect(page).toHaveURL(/weekly-planner/)
    
    // Check that we navigated away from dashboard
    await expect(page).not.toHaveURL(/dashboard\/runner/)
  })

  test('should navigate to workouts page', async ({ page }) => {
    await loginAsUser(page, 'runner')
    await assertAuthenticated(page, 'runner')

    // Wait for navigation to be available
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 })
    
    // Click on "Workouts" navigation link
    await page.click('text=Workouts')

    // Should navigate to workouts page
    await expect(page).toHaveURL(/workouts/)
    
    // Check that we navigated away from dashboard
    await expect(page).not.toHaveURL(/dashboard\/runner/)
  })

  test('should navigate to chat page', async ({ page }) => {
    await loginAsUser(page, 'runner')
    await assertAuthenticated(page, 'runner')

    // Wait for navigation to be available
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 })
    
    // Click on "Messages" navigation link
    await page.click('text=Messages')

    // Should navigate to messages/chat page
    await expect(page).toHaveURL(/messages|chat/)
    
    // Check that we navigated away from dashboard
    await expect(page).not.toHaveURL(/dashboard\/runner/)
  })
})
