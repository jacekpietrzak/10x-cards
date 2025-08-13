import { test, expect } from "@playwright/test";
import { FlashcardGenerationPage } from "./pages";

test.describe("Flashcard Generation Flow", () => {
  let page: FlashcardGenerationPage;

  test.beforeEach(async ({ page: playwrightPage }) => {
    // Authentication is handled by the setup project
    // We can go directly to the generate page
    page = new FlashcardGenerationPage(playwrightPage);
    await page.goto();
  });

  test("should complete full flashcard generation and save flow", async () => {
    // Step 1: Enter text (between 1000-10000 characters)
    // Use more meaningful text that will generate multiple flashcards
    const sampleText = `
      JavaScript is a high-level, interpreted programming language that conforms to the ECMAScript specification. 
      It is characterized as dynamic, weakly typed, prototype-based and multi-paradigm.
      
      React is a JavaScript library for building user interfaces. It is maintained by Facebook and a community 
      of individual developers and companies. React can be used as a base in the development of single-page applications.
      
      TypeScript is a programming language developed and maintained by Microsoft. It is a strict syntactical 
      superset of JavaScript and adds optional static typing to the language. TypeScript is designed for the 
      development of large applications and transcompiles to JavaScript.
      
      Node.js is an open-source, cross-platform, back-end JavaScript runtime environment that runs on the V8 engine 
      and executes JavaScript code outside a web browser. Node.js lets developers use JavaScript to write command 
      line tools and for server-side scripting.
      
      Vue.js is an open-source model–view–viewmodel front end JavaScript framework for building user interfaces 
      and single-page applications. It was created by Evan You, and is maintained by him and the rest of the 
      active core team members.
    `.repeat(2); // Repeat to ensure we have enough characters

    await page.enterText(sampleText);

    // Verify text was entered and character count is valid
    const isValidLength = await page.textInputArea.isValidLength();
    expect(isValidLength).toBeTruthy();

    // Step 2: Click Generate Flashcards button
    await page.clickGenerateFlashcards();

    // Step 3: Wait for proposals to be generated
    await page.waitForGeneration();

    // Verify proposals are displayed
    const proposalCount = await page.flashcardProposal.getProposalCount();
    expect(proposalCount).toBeGreaterThan(0);

    // Step 4: Accept all proposals
    await page.acceptAllProposals();

    // Verify accepted flashcards section is visible
    const isAcceptedVisible =
      await page.acceptedFlashcards.isContainerVisible();
    expect(isAcceptedVisible).toBeTruthy();

    // Verify accepted count matches (should have accepted all proposals)
    const acceptedCount = await page.acceptedFlashcards.getCount();
    expect(acceptedCount).toBeGreaterThan(0);
    expect(acceptedCount).toBeLessThanOrEqual(proposalCount);

    // Step 5: Save all accepted flashcards
    await page.saveAcceptedFlashcards();

    // Wait for save to complete
    await page.acceptedFlashcards.waitForSaveComplete();

    // Verify success (form should be reset)
    const textAfterSave = await page.textInputArea.getText();
    expect(textAfterSave).toBe("");
  });

  test("should accept only selected flashcards", async () => {
    // Enter valid text with content that should generate multiple flashcards
    const sampleText = `
      What is React? React is a JavaScript library for building user interfaces.
      What is TypeScript? TypeScript is a typed superset of JavaScript.
      What is Node.js? Node.js is a JavaScript runtime built on Chrome's V8 engine.
      What is Vue? Vue is a progressive JavaScript framework.
      What is Angular? Angular is a platform for building web applications.
    `.repeat(10); // Ensure we have enough text

    await page.enterText(sampleText);

    // Generate flashcards
    await page.clickGenerateFlashcards();
    await page.waitForGeneration();

    // Get the total count of proposals
    const proposalCount = await page.flashcardProposal.getProposalCount();

    // Only proceed if we have at least 2 proposals
    if (proposalCount >= 2) {
      // Accept only first 2 proposals
      await page.acceptFirstNProposals(2);

      // Verify only 2 are accepted
      const acceptedCount = await page.acceptedFlashcards.getCount();
      expect(acceptedCount).toBe(2);

      // Verify save button shows correct count
      const saveButtonText = await page.acceptedFlashcards.getSaveButtonText();
      expect(saveButtonText).toContain("Save 2 Flashcard");
    } else {
      // If only 1 proposal, accept it
      await page.acceptAllProposals();
      const acceptedCount = await page.acceptedFlashcards.getCount();
      expect(acceptedCount).toBe(proposalCount);
    }
  });

  test("should validate minimum text length", async () => {
    // Enter text less than 1000 characters
    const shortText = "Too short text";
    await page.enterText(shortText);

    // Verify generate button is disabled
    const isDisabled = await page.isGenerateButtonDisabled();
    expect(isDisabled).toBeTruthy();
  });

  test("should validate maximum text length", async () => {
    // Enter text more than 10000 characters
    const longText = "a".repeat(10001);
    await page.enterText(longText);

    // Verify generate button is disabled
    const isDisabled = await page.isGenerateButtonDisabled();
    expect(isDisabled).toBeTruthy();
  });

  test("should allow editing proposals before accepting", async () => {
    // Enter valid text and generate
    const sampleText = "a".repeat(1500);
    await page.enterText(sampleText);
    await page.clickGenerateFlashcards();
    await page.waitForGeneration();

    // Edit first proposal
    const firstProposal = await page.flashcardProposal.getProposalByIndex(0);
    if (firstProposal) {
      await page.flashcardProposal.editProposal(firstProposal);

      // Verify edit mode is active (edit button should change)
      const editButton = firstProposal.locator(
        '[data-test-id="flashcard-edit-button"]',
      );
      const isEditMode = await editButton.isHidden();
      expect(isEditMode).toBeTruthy();
    }
  });

  test("should handle rejection of proposals", async () => {
    // Enter valid text and generate
    const sampleText = "a".repeat(1500);
    await page.enterText(sampleText);
    await page.clickGenerateFlashcards();
    await page.waitForGeneration();

    const initialCount = await page.flashcardProposal.getProposalCount();

    // Reject first proposal
    await page.flashcardProposal.rejectProposalByIndex(0);

    // Wait a bit for the UI to update
    await page.page.waitForTimeout(500);

    // Verify proposal count decreased
    const newCount = await page.flashcardProposal.getProposalCount();
    expect(newCount).toBe(initialCount - 1);
  });
});
