import { test as setup } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  console.log('🚀 Starting authentication setup...');
  
  // Navigate to login page
  await page.goto('/login');
  console.log('📍 Navigated to login page');
  
  // Get credentials from environment variables (using .env.example format)
  const email = process.env.E2E_USERNAME || process.env.TEST_USER_EMAIL;
  const password = process.env.E2E_PASSWORD || process.env.TEST_USER_PASSWORD;
  
  if (!email || !password) {
    throw new Error('E2E_USERNAME and E2E_PASSWORD must be set in .env.test');
  }
  
  console.log(`🔐 Authenticating with email: ${email}`);
  
  // Wait for the page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  // Fill in the form
  await page.fill('[data-test-id="login-email-input"]', email);
  await page.fill('[data-test-id="login-password-input"]', password);
  console.log('✅ Credentials filled');
  
  // Submit the form and wait for response
  await page.click('[data-test-id="login-submit-button"]');
  console.log('🖱️ Login button clicked');
  
  // Wait for either success (redirect) or error
  await page.waitForTimeout(2000); // Give server time to process
  
  const currentUrl = page.url();
  console.log(`📍 Current URL after login attempt: ${currentUrl}`);
  
  // If we're still on login page, wait a bit more for redirect
  if (currentUrl.includes('/login')) {
    console.log('⏳ Still on login page, waiting for redirect...');
    
    // Try to wait for navigation
    try {
      await page.waitForURL((url) => !url.toString().includes('/login'), {
        timeout: 10000
      });
      console.log('✅ Redirected away from login page');
    } catch {
      // Check for errors if no redirect happened
      const errorText = await page.locator('[role="alert"]').textContent().catch(() => null);
      if (errorText) {
        throw new Error(`Login failed with error: ${errorText}`);
      }
      
      // Check if credentials are incorrect
      const bodyText = await page.textContent('body');
      if (bodyText.toLowerCase().includes('invalid')) {
        throw new Error('Invalid credentials - please check TEST_USER_EMAIL and TEST_USER_PASSWORD');
      }
      
      throw new Error('Login failed - no redirect occurred');
    }
  }
  
  // Final URL check
  const finalUrl = page.url();
  console.log(`✅ Successfully logged in, now at: ${finalUrl}`);
  
  if (finalUrl.includes('/login') || finalUrl.includes('/register')) {
    throw new Error('Authentication failed - still on auth page');
  }
  
  console.log('✅ Authentication successful!');
  
  // Save storage state
  await page.context().storageState({ path: authFile });
  console.log('💾 Auth state saved');
});