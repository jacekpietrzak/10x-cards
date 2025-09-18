import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FlashcardViewer } from "../session/FlashcardViewer";
import type { FlashcardDto } from "@/lib/types";

describe("FlashcardViewer Component", () => {
  const mockCard: FlashcardDto = {
    id: "1",
    front: "Test Question",
    back: "Test Answer",
    state: 0,
    due: new Date().toISOString(),
    stability: 2.5,
    difficulty: 0.3,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    last_review: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: "test-user",
  };

  const mockOnShowAnswer = vi.fn();

  it("should display front side initially with hidden answer", () => {
    render(
      <FlashcardViewer
        card={mockCard}
        isAnswerVisible={false}
        onShowAnswer={mockOnShowAnswer}
      />
    );
    expect(screen.getByText("Test Question")).toBeInTheDocument();
    expect(screen.queryByText("Test Answer")).not.toBeInTheDocument();
    expect(screen.getByText("Show answer")).toBeInTheDocument();
  });

  it("should show back side when answer is visible", () => {
    render(
      <FlashcardViewer
        card={mockCard}
        isAnswerVisible={true}
        onShowAnswer={mockOnShowAnswer}
      />
    );

    expect(screen.getByText("Test Question")).toBeInTheDocument();
    expect(screen.getByText("Test Answer")).toBeInTheDocument();
    expect(screen.queryByText("Show answer")).not.toBeInTheDocument();
  });

  it("should call onShowAnswer when button is clicked", () => {
    render(
      <FlashcardViewer
        card={mockCard}
        isAnswerVisible={false}
        onShowAnswer={mockOnShowAnswer}
      />
    );

    const showAnswerButton = screen.getByText("Show answer");
    fireEvent.click(showAnswerButton);

    expect(mockOnShowAnswer).toHaveBeenCalledTimes(1);
  });

  it("should display question and answer labels", () => {
    render(
      <FlashcardViewer
        card={mockCard}
        isAnswerVisible={true}
        onShowAnswer={mockOnShowAnswer}
      />
    );

    expect(screen.getByText("Pytanie")).toBeInTheDocument();
    expect(screen.getByText("Odpowiedź")).toBeInTheDocument();
  });
});
