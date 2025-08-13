import { Page, Locator } from "@playwright/test";
import { TextInputArea } from "./components/TextInputArea";
import { FlashcardProposal } from "./components/FlashcardProposal";
import { AcceptedFlashcards } from "./components/AcceptedFlashcards";

export class FlashcardGenerationPage {
  readonly page: Page;
  readonly textInputArea: TextInputArea;
  readonly flashcardProposal: FlashcardProposal;
  readonly acceptedFlashcards: AcceptedFlashcards;
  readonly generateButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.textInputArea = new TextInputArea(page);
    this.flashcardProposal = new FlashcardProposal(page);
    this.acceptedFlashcards = new AcceptedFlashcards(page);
    this.generateButton = page.locator(
      '[data-test-id="generate-flashcards-button"]',
    );
  }

  async goto() {
    await this.page.goto("/generate");
  }

  async enterText(text: string) {
    await this.textInputArea.enterText(text);
  }

  async clickGenerateFlashcards() {
    await this.generateButton.click();
  }

  async waitForGeneration() {
    await this.page.waitForSelector(
      '[data-test-id="flashcard-proposals-list"]',
      {
        timeout: 30000,
      },
    );
  }

  async acceptAllProposals() {
    const proposals = await this.flashcardProposal.getAllProposals();
    for (const proposal of proposals) {
      await this.flashcardProposal.acceptProposal(proposal);
    }
  }

  async acceptFirstNProposals(n: number) {
    const proposals = await this.flashcardProposal.getAllProposals();
    const toAccept = proposals.slice(0, n);
    for (const proposal of toAccept) {
      await this.flashcardProposal.acceptProposal(proposal);
    }
  }

  async saveAcceptedFlashcards() {
    await this.acceptedFlashcards.clickSaveButton();
  }

  async getAcceptedFlashcardsCount() {
    return await this.acceptedFlashcards.getCount();
  }

  async isGenerateButtonDisabled() {
    return await this.generateButton.isDisabled();
  }

  async waitForSaveComplete() {
    await this.page.waitForSelector(
      '[data-test-id="bulk-save-flashcards-button"]:not(:disabled)',
      {
        state: "hidden",
        timeout: 10000,
      },
    );
  }
}
