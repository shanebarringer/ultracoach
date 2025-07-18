import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display signin page', async ({ page }) => {
    await page.goto('/auth/signin');
    await expect(page.locator('h1')).toContainText('🏔️ UltraCoach');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Wait for signin form to load
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill in test credentials
    await page.fill('input[type="email"]', 'runner1@ultracoach.dev');
    await page.fill('input[type="password"]', 'password123');
    
    // Click sign in
    await page.click('button[type="submit"]');
    
    // Should redirect to runner dashboard (with extended timeout)
    await expect(page).toHaveURL(/dashboard\/runner/, { timeout: 20000 });
    await page.waitForSelector('h1', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Base Camp Dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Click sign in
    await page.click('button[type="submit"]');
    
    // Should show error message (check for error state in input field)
    await expect(page.locator('input[type="email"]')).toHaveAttribute('aria-invalid', 'true');
  });
});

test.describe('Landing Page', () => {
  test('should display landing page with proper navigation', async ({ page }) => {
    await page.goto('/');
    
    // Wait for loading to complete - the page shows a spinner while checking auth
    await page.waitForSelector('h1', { timeout: 15000 });
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('Conquer Your Peaks');
    
    // Check navigation links (first one in header)
    await expect(page.locator('a[href="/auth/signin"]').first()).toBeVisible();
    await expect(page.locator('button:has-text("Sign Up")')).toBeVisible();
  });

  test('should navigate to signin page from landing page', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load completely
    await page.waitForSelector('a[href="/auth/signin"]', { timeout: 15000 });
    
    // Click sign in button (first one in header)
    await page.click('a[href="/auth/signin"]:first-child');
    
    // Should navigate to signin page
    await expect(page).toHaveURL('/auth/signin');
  });
});