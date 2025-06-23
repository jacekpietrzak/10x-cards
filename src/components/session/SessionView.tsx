import { useEffect } from "react";
import { FlashcardViewer } from "./FlashcardViewer";
import { ReviewControls } from "./ReviewControls";
import { Badge } from "@/components/ui/badge";
import type { FlashcardDto, FSRSGrade } from "@/lib/types";

interface SessionViewProps {
  card: FlashcardDto;
  isAnswerVisible: boolean;
  onShowAnswer: () => void;
  onRate: (rating: FSRSGrade) => void;
  progress: {
    current: number;
    total: number;
  };
  isSubmittingReview?: boolean;
}

export function SessionView({
  card,
  isAnswerVisible,
  onShowAnswer,
  onRate,
  progress,
  isSubmittingReview = false,
}: SessionViewProps) {
  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (isSubmittingReview) return;

      // Space bar to show answer
      if (event.code === "Space" && !isAnswerVisible) {
        event.preventDefault();
        onShowAnswer();
        return;
      }

      // Number keys for rating (only when answer is visible)
      if (
        isAnswerVisible &&
        ["Digit1", "Digit2", "Digit3", "Digit4"].includes(event.code)
      ) {
        event.preventDefault();
        const rating = parseInt(event.code.replace("Digit", "")) as FSRSGrade;
        onRate(rating);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isAnswerVisible, isSubmittingReview, onShowAnswer, onRate]);

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      {/* Progress indicator */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Sesja nauki</h1>
        <Badge variant="secondary" className="text-sm">
          {progress.current} / {progress.total}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(progress.current / progress.total) * 100}%` }}
        />
      </div>

      {/* Flashcard */}
      <FlashcardViewer
        card={card}
        isAnswerVisible={isAnswerVisible}
        onShowAnswer={onShowAnswer}
      />

      {/* Review controls - shown only when answer is visible */}
      {isAnswerVisible && (
        <ReviewControls onRate={onRate} isLoading={isSubmittingReview} />
      )}
    </div>
  );
}
