import { Button } from "@/components/ui/button";
import type { FSRSGrade } from "@/lib/types";

interface ReviewControlsProps {
  onRate: (rating: FSRSGrade) => void;
  isLoading?: boolean;
}

export function ReviewControls({
  onRate,
  isLoading = false,
}: ReviewControlsProps) {
  const ratings = [
    {
      grade: 1 as FSRSGrade,
      label: "Again",
      variant: "destructive" as const,
      description: "Don't remember",
    },
    {
      grade: 2 as FSRSGrade,
      label: "Hard",
      variant: "secondary" as const,
      description: "Barely remember",
    },
    {
      grade: 3 as FSRSGrade,
      label: "Good",
      variant: "default" as const,
      description: "Remember well",
    },
    {
      grade: 4 as FSRSGrade,
      label: "Easy",
      variant: "default" as const,
      description: "Remember perfectly",
    },
  ];

  return (
    <div className="space-y-4" role="region" aria-label="Flashcard rating">
      <p className="text-center text-muted-foreground" id="rating-instructions">
        How well do you remember this answer?
      </p>
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        role="group"
        aria-labelledby="rating-instructions"
      >
        {ratings.map(({ grade, label, variant, description }, index) => (
          <Button
            key={grade}
            variant={variant}
            onClick={() => onRate(grade)}
            disabled={isLoading}
            className="flex flex-col h-auto py-3 px-2"
            aria-label={`${label}: ${description}. Press ${
              index + 1
            } on keyboard`}
          >
            <span className="font-semibold text-sm">{label}</span>
            <span className="text-xs opacity-80 text-center leading-tight mt-1">
              {description}
            </span>
            <span className="sr-only">Key {index + 1}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
