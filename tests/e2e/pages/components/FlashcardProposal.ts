import { Page, Locator } from "@playwright/test";

export class FlashcardProposal {
  readonly page: Page;
  readonly proposalsList: Locator;
  readonly proposalItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.proposalsList = page.locator(
      '[data-test-id="flashcard-proposals-list"]',
    );
    this.proposalItems = page.locator(
      '[data-test-id="flashcard-proposal-item"]',
    );
  }

  async getAllProposals() {
    await this.proposalsList.waitFor({ state: "visible" });
    return await this.proposalItems.all();
  }

  async getProposalCount() {
    const proposals = await this.getAllProposals();
    return proposals.length;
  }

  async getProposalByIndex(index: number) {
    const proposals = await this.getAllProposals();
    return proposals[index];
  }

  async acceptProposal(proposal: Locator) {
    const acceptButton = proposal.locator(
      '[data-test-id="flashcard-accept-button"]',
    );
    await acceptButton.click();
  }

  async rejectProposal(proposal: Locator) {
    const rejectButton = proposal.locator(
      '[data-test-id="flashcard-reject-button"]',
    );
    await rejectButton.click();
  }

  async editProposal(proposal: Locator) {
    const editButton = proposal.locator(
      '[data-test-id="flashcard-edit-button"]',
    );
    await editButton.click();
  }

  async acceptProposalByIndex(index: number) {
    const proposal = await this.getProposalByIndex(index);
    if (proposal) {
      await this.acceptProposal(proposal);
    }
  }

  async rejectProposalByIndex(index: number) {
    const proposal = await this.getProposalByIndex(index);
    if (proposal) {
      await this.rejectProposal(proposal);
    }
  }

  async getProposalContent(proposal: Locator) {
    const front = await proposal.locator(".bg-muted").nth(0).textContent();
    const back = await proposal.locator(".bg-muted").nth(1).textContent();
    return { front, back };
  }

  async getProposalContentByIndex(index: number) {
    const proposal = await this.getProposalByIndex(index);
    if (proposal) {
      return await this.getProposalContent(proposal);
    }
    return null;
  }

  async waitForProposals(minCount: number = 1) {
    await this.page.waitForFunction(
      (expectedCount) => {
        const items = document.querySelectorAll(
          '[data-test-id="flashcard-proposal-item"]',
        );
        return items.length >= expectedCount;
      },
      minCount,
      { timeout: 30000 },
    );
  }

  async isListVisible() {
    return await this.proposalsList.isVisible();
  }
}
