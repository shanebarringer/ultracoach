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
    
    // Fill in test credentials
    await page.fill('input[type="email"]', 'runner1@ultracoach.dev');
    await page.fill('input[type="password"]', 'password123');
    
    // Click sign in
    await page.click('button[type="submit"]');
    
    // Should redirect to runner dashboard
    await expect(page).toHaveURL(/dashboard\/runner/);
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
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('Conquer Your Peaks');
    
    // Check navigation links
    await expect(page.locator('a[href="/auth/signin"]')).toBeVisible();
    await expect(page.locator('a[href="/auth/signup"]')).toBeVisible();
  });

  test('should navigate to signin page from landing page', async ({ page }) => {
    await page.goto('/');
    
    // Click sign in button
    await page.click('a[href="/auth/signin"]');
    
    // Should navigate to signin page
    await expect(page).toHaveURL('/auth/signin');
  });
});