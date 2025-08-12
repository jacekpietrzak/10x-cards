import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[data-test-id="login-email-input"]');
    this.passwordInput = page.locator('[data-test-id="login-password-input"]');
    this.submitButton = page.locator('[data-test-id="login-submit-button"]');
    this.errorMessage = page.locator('[role="alert"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    // Wait for inputs to be ready
    await this.emailInput.waitFor({ state: 'visible' });
    await this.passwordInput.waitFor({ state: 'visible' });
    
    // Clear and fill inputs
    await this.emailInput.clear();
    await this.emailInput.fill(email);
    
    await this.passwordInput.clear();
    await this.passwordInput.fill(password);
    
    // Wait for button to be enabled
    await this.submitButton.waitFor({ state: 'visible' });
    await expect(this.submitButton).toBeEnabled();
    
    // Click and wait for response
    await this.submitButton.click();
  }

  async waitForLogin() {
    // Wait for either redirect or error
    await Promise.race([
      this.page.waitForURL('**/generate', { timeout: 10000 }),
      this.page.waitForURL('**/flashcards', { timeout: 10000 }),
      this.errorMessage.waitFor({ state: 'visible', timeout: 10000 })
    ]).catch(() => {
      // If none of the above happen, check current URL
      const url = this.page.url();
      if (!url.includes('/login')) {
        // We've navigated away from login, consider it success
        return;
      }
      throw new Error('Login failed - still on login page');
    });
  }

  async isLoggedIn() {
    const url = this.page.url();
    return !url.includes('/login') && !url.includes('/register');
  }

  async getErrorMessage() {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }
}