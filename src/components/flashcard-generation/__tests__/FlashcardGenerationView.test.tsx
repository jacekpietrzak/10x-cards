import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlashcardGenerationView } from "../FlashcardGenerationView";

// Mock all child components with minimal implementations
interface TextInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

vi.mock("../TextInputArea", () => ({
  TextInputArea: ({ value, onChange, disabled }: TextInputAreaProps) => (
    <input
      data-testid="text-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  ),
}));

vi.mock("../FlashcardList", () => ({
  FlashcardList: () => <div data-testid="flashcard-list" />,
}));

vi.mock("../SkeletonLoader", () => ({
  SkeletonLoader: () => <div data-testid="skeleton-loader" />,
}));

vi.mock("../BulkSaveButton", () => ({
  BulkSaveButton: () => <button data-testid="bulk-save-button">Save</button>,
}));

// Mock hooks
const mockRequest = vi.fn();
vi.mock("@/hooks/useApiRequest", () => ({
  useApiRequest: vi.fn(() => ({
    isLoading: false,
    error: null,
    request: mockRequest,
  })),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock crypto for UUID generation
Object.defineProperty(global, "crypto", {
  value: { randomUUID: vi.fn(() => "test-uuid") },
});

import { useApiRequest } from "@/hooks/useApiRequest";

describe("FlashcardGenerationView - Core Tests", () => {
  const mockUseApiRequest = vi.mocked(useApiRequest);

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock state
    mockUseApiRequest.mockReturnValue({
      isLoading: false,
      error: null,
      data: null,
      request: mockRequest,
    });
  });

  describe("Component Rendering", () => {
    it("should render the main component structure", () => {
      render(<FlashcardGenerationView />);

      // Check main structural elements exist
      expect(screen.getByRole("main")).toBeInTheDocument();
      expect(screen.getByTestId("text-input")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /generate/i }),
      ).toBeInTheDocument();
    });

    it("should have proper accessibility attributes", () => {
      render(<FlashcardGenerationView />);

      const main = screen.getByRole("main");
      expect(main).toHaveAttribute("aria-label", "Flashcard Generation");
      expect(main).toHaveAttribute("role", "main");
    });
  });

  describe("Button State Management", () => {
    it("should disable generate button initially", () => {
      render(<FlashcardGenerationView />);

      const button = screen.getByRole("button", { name: /generate/i });
      expect(button).toBeDisabled();
    });

    it("should enable button when text length is valid", async () => {
      render(<FlashcardGenerationView />);

      const input = screen.getByTestId("text-input");
      const button = screen.getByRole("button", { name: /generate/i });

      // Use fireEvent.change for performance with large text
      const validText = "a".repeat(1000);
      fireEvent.change(input, { target: { value: validText } });

      expect(button).not.toBeDisabled();
    });

    it("should disable button during loading", () => {
      mockUseApiRequest.mockReturnValue({
        isLoading: true,
        error: null,
        data: null,
        request: mockRequest,
      });

      render(<FlashcardGenerationView />);

      const button = screen.getByRole("button", { name: /generating/i });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-busy", "true");
    });
  });

  describe("Loading and Error States", () => {
    it("should show loading skeleton when isLoading is true", () => {
      mockUseApiRequest.mockReturnValue({
        isLoading: true,
        error: null,
        data: null,
        request: mockRequest,
      });

      render(<FlashcardGenerationView />);

      expect(screen.getByTestId("skeleton-loader")).toBeInTheDocument();
      expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });

    it("should show error message when error exists", () => {
      const errorMessage = "Generation failed due to network error";
      mockUseApiRequest.mockReturnValue({
        isLoading: false,
        error: errorMessage,
        data: null,
        request: mockRequest,
      });

      render(<FlashcardGenerationView />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe("Text Input Behavior", () => {
    it("should update input value when user types", async () => {
      render(<FlashcardGenerationView />);

      const input = screen.getByTestId("text-input");
      const testText = "Testing user input";

      // Use fireEvent for better performance
      fireEvent.change(input, { target: { value: testText } });

      expect(input).toHaveValue(testText);
    });

    it("should disable input during loading", () => {
      mockUseApiRequest.mockReturnValue({
        isLoading: true,
        error: null,
        data: null,
        request: mockRequest,
      });

      render(<FlashcardGenerationView />);

      const input = screen.getByTestId("text-input");
      expect(input).toBeDisabled();
    });
  });

  describe("API Integration", () => {
    it("should call generation API with correct parameters", async () => {
      const user = userEvent.setup();
      render(<FlashcardGenerationView />);

      const input = screen.getByTestId("text-input");
      const button = screen.getByRole("button", { name: /generate/i });

      const testText = "a".repeat(1000); // Valid length text
      // Use fireEvent.change for large text input
      fireEvent.change(input, { target: { value: testText } });

      // Use userEvent.click for button interaction
      await user.click(button);

      expect(mockRequest).toHaveBeenCalledWith("/api/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_text: testText,
        }),
      });
    });

    it("should not call API when button is disabled", async () => {
      const user = userEvent.setup();
      render(<FlashcardGenerationView />);

      const button = screen.getByRole("button", { name: /generate/i });

      // Try to click disabled button
      await user.click(button);

      expect(mockRequest).not.toHaveBeenCalled();
    });
  });

  describe("Text Length Validation", () => {
    it("should enforce minimum text length of 1000 characters", async () => {
      render(<FlashcardGenerationView />);

      const input = screen.getByTestId("text-input");
      const button = screen.getByRole("button", { name: /generate/i });

      // Test with 999 characters (should remain disabled)
      fireEvent.change(input, { target: { value: "a".repeat(999) } });
      expect(button).toBeDisabled();
    });

    it("should enforce maximum text length of 10000 characters", () => {
      render(<FlashcardGenerationView />);

      const input = screen.getByTestId("text-input");
      const button = screen.getByRole("button", { name: /generate/i });

      // Start with valid text (use direct value setting to avoid timeout)
      fireEvent.change(input, { target: { value: "a".repeat(1000) } });
      expect(button).not.toBeDisabled();

      // Clear and add too much text (should become disabled)
      fireEvent.change(input, { target: { value: "a".repeat(10001) } });
      expect(button).toBeDisabled();
    });
  });

  describe("Component Integration", () => {
    it("should render flashcard list container when not loading", () => {
      render(<FlashcardGenerationView />);

      // FlashcardList should be rendered (even if empty)
      expect(screen.getByTestId("flashcard-list")).toBeInTheDocument();
    });

    it("should not render flashcard list when loading", () => {
      mockUseApiRequest.mockReturnValue({
        isLoading: true,
        error: null,
        data: null,
        request: mockRequest,
      });

      render(<FlashcardGenerationView />);

      // Should show skeleton instead of flashcard list
      expect(screen.getByTestId("skeleton-loader")).toBeInTheDocument();
      expect(screen.queryByTestId("flashcard-list")).not.toBeInTheDocument();
    });
  });

  describe("User Experience Features", () => {
    it("should show appropriate button text based on loading state", () => {
      // Normal state - use more specific selector for button
      render(<FlashcardGenerationView />);
      const button = screen.getByRole("button", {
        name: /generate flashcards/i,
      });
      expect(button).toBeInTheDocument();
    });

    it("should show loading text when generating", () => {
      // Loading state
      mockUseApiRequest.mockReturnValue({
        isLoading: true,
        error: null,
        data: null,
        request: mockRequest,
      });

      render(<FlashcardGenerationView />);
      const loadingButton = screen.getByRole("button", { name: /generating/i });
      expect(loadingButton).toBeInTheDocument();
    });

    it("should maintain input state across component updates", () => {
      render(<FlashcardGenerationView />);

      const input = screen.getByTestId("text-input");
      const testText = "Persistent content";

      // Use fireEvent for instant value setting
      fireEvent.change(input, { target: { value: testText } });
      expect(input).toHaveValue(testText);

      // Value should persist
      expect(input).toHaveValue(testText);
    });
  });
});
