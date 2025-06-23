import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SessionSummaryProps {
  reviewedCount: number;
  onStartAgain: () => Promise<void>;
}

export function SessionSummary({
  reviewedCount,
  onStartAgain,
}: SessionSummaryProps) {
  const [isStartingAgain, setIsStartingAgain] = useState(false);

  const handleStartAgain = async () => {
    setIsStartingAgain(true);
    try {
      await onStartAgain();
    } finally {
      setIsStartingAgain(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Sesja zakończona!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-6xl font-bold text-primary mb-4">
            {reviewedCount}
          </div>
          <p className="text-lg text-muted-foreground">
            {reviewedCount === 1
              ? "Powtórzyłeś 1 fiszkę"
              : `Powtórzyłeś ${reviewedCount} fiszek`}
          </p>
          <p className="text-muted-foreground">
            Świetna robota! Regularne powtórki pomagają w lepszym
            zapamiętywaniu.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button
              onClick={handleStartAgain}
              disabled={isStartingAgain}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isStartingAgain ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Rozpoczynam...
                </>
              ) : (
                "Rozpocznij ponownie"
              )}
            </Button>
            <Button asChild>
              <Link href="/flashcards">Moje fiszki</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/generate">Wygeneruj nowe fiszki</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
