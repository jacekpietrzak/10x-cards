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
      label: "Znowu",
      variant: "destructive" as const,
      description: "Nie pamiętam",
    },
    {
      grade: 2 as FSRSGrade,
      label: "Trudne",
      variant: "secondary" as const,
      description: "Pamiętam z trudem",
    },
    {
      grade: 3 as FSRSGrade,
      label: "Dobre",
      variant: "default" as const,
      description: "Pamiętam dobrze",
    },
    {
      grade: 4 as FSRSGrade,
      label: "Łatwe",
      variant: "default" as const,
      description: "Pamiętam bez problemu",
    },
  ];

  return (
    <div className="space-y-4" role="region" aria-label="Ocena fiszki">
      <p className="text-center text-muted-foreground" id="rating-instructions">
        Jak dobrze pamiętasz tę odpowiedź?
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
            aria-label={`${label}: ${description}. Naciśnij ${
              index + 1
            } na klawiaturze`}
          >
            <span className="font-semibold text-sm">{label}</span>
            <span className="text-xs opacity-80 text-center leading-tight mt-1">
              {description}
            </span>
            <span className="sr-only">Klawisz {index + 1}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
