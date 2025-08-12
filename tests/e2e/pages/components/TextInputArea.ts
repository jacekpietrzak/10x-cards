import { Page, Locator } from '@playwright/test';

export class TextInputArea {
  readonly page: Page;
  readonly textInput: Locator;
  readonly characterCount: Locator;
  readonly remainingCharacters: Locator;

  constructor(page: Page) {
    this.page = page;
    this.textInput = page.locator('[data-test-id="flashcard-generation-text-input"]');
    // More specific selectors to avoid ambiguity
    this.characterCount = page.locator('.text-sm span').filter({ hasText: /^\d+(?:,\d+)? characters$/ });
    this.remainingCharacters = page.locator('.text-sm span').filter({ hasText: /^\d+(?:,\d+)? remaining$/ });
  }

  async enterText(text: string) {
    await this.textInput.fill(text);
  }

  async appendText(text: string) {
    const currentText = await this.textInput.inputValue();
    await this.textInput.fill(currentText + text);
  }

  async clearText() {
    await this.textInput.clear();
  }

  async getText() {
    return await this.textInput.inputValue();
  }

  async getCharacterCount() {
    const text = await this.characterCount.textContent();
    if (!text) return 0;
    const match = text.match(/(\d+(?:,\d+)?)/);
    return match ? parseInt(match[1].replace(',', '')) : 0;
  }

  async getRemainingCharacters() {
    const text = await this.remainingCharacters.textContent();
    if (!text) return 0;
    const match = text.match(/(\d+(?:,\d+)?)/);
    return match ? parseInt(match[1].replace(',', '')) : 0;
  }

  async isValidLength() {
    const count = await this.getCharacterCount();
    return count >= 1000 && count <= 10000;
  }

  async waitForInput() {
    await this.textInput.waitFor({ state: 'visible' });
  }

  async isDisabled() {
    return await this.textInput.isDisabled();
  }
}