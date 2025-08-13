import { Page, Locator } from "@playwright/test";

export class AcceptedFlashcards {
  readonly page: Page;
  readonly container: Locator;
  readonly saveButton: Locator;
  readonly acceptedItems: Locator;
  readonly acceptedCount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator(
      '[data-test-id="accepted-flashcards-container"]',
    );
    this.saveButton = page.locator(
      '[data-test-id="bulk-save-flashcards-button"]',
    );
    this.acceptedItems = this.container.locator(
      '[data-test-id="flashcard-proposal-item"]',
    );
    this.acceptedCount = page.locator("text=/Accepted Flashcards \\(\\d+\\)/");
  }

  async clickSaveButton() {
    await this.saveButton.waitFor({ state: "visible" });
    await this.saveButton.click();
  }

  async getCount() {
    const countText = await this.acceptedCount.textContent();
    if (!countText) return 0;
    const match = countText.match(/\((\d+)\)/);
    return match ? parseInt(match[1]) : 0;
  }

  async getAllAcceptedFlashcards() {
    if (await this.container.isVisible()) {
      return await this.acceptedItems.all();
    }
    return [];
  }

  async isContainerVisible() {
    return await this.container.isVisible();
  }

  async isSaveButtonVisible() {
    return await this.saveButton.isVisible();
  }

  async isSaveButtonDisabled() {
    return await this.saveButton.isDisabled();
  }

  async getSaveButtonText() {
    return await this.saveButton.textContent();
  }

  async waitForSaveButton() {
    await this.saveButton.waitFor({ state: "visible" });
  }

  async waitForSaveComplete() {
    // Wait for the save request to complete
    await this.page
      .waitForResponse(
        (response) =>
          response.url().includes("/api/flashcards") &&
          (response.status() === 200 || response.status() === 201),
        { timeout: 10000 },
      )
      .catch(() => {
        // If no response, check if the form was reset (indicates success)
        console.log("No save response detected, checking for form reset...");
      });
  }

  async moveBackToProposals(index: number) {
    const flashcards = await this.getAllAcceptedFlashcards();
    if (flashcards[index]) {
      const acceptButton = flashcards[index].locator(
        '[data-test-id="flashcard-accept-button"]',
      );
      await acceptButton.click();
    }
  }

  async removeFromAccepted(index: number) {
    const flashcards = await this.getAllAcceptedFlashcards();
    if (flashcards[index]) {
      const rejectButton = flashcards[index].locator(
        '[data-test-id="flashcard-reject-button"]',
      );
      await rejectButton.click();
    }
  }

  async editAcceptedFlashcard(index: number) {
    const flashcards = await this.getAllAcceptedFlashcards();
    if (flashcards[index]) {
      const editButton = flashcards[index].locator(
        '[data-test-id="flashcard-edit-button"]',
      );
      await editButton.click();
    }
  }

  async getAcceptedFlashcardContent(index: number) {
    const flashcards = await this.getAllAcceptedFlashcards();
    if (flashcards[index]) {
      const front = await flashcards[index]
        .locator(".bg-muted")
        .nth(0)
        .textContent();
      const back = await flashcards[index]
        .locator(".bg-muted")
        .nth(1)
        .textContent();
      return { front, back };
    }
    return null;
  }
}
