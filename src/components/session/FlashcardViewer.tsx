import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FlashcardDto } from "@/lib/types";

interface FlashcardViewerProps {
  card: FlashcardDto;
  isAnswerVisible: boolean;
  onShowAnswer: () => void;
}

export function FlashcardViewer({
  card,
  isAnswerVisible,
  onShowAnswer,
}: FlashcardViewerProps) {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Fiszka</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Front side */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Pytanie
          </h3>
          <div className="p-4 bg-muted rounded-lg min-h-[80px] flex items-center justify-center">
            <p className="text-lg text-center leading-relaxed">{card.front}</p>
          </div>
        </div>

        {/* Show Answer Button */}
        {!isAnswerVisible && (
          <div className="text-center">
            <Button onClick={onShowAnswer} size="lg">
              Pokaż odpowiedź
            </Button>
          </div>
        )}

        {/* Back side - shown only when answer is visible */}
        {isAnswerVisible && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Odpowiedź
            </h3>
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg min-h-[80px] flex items-center justify-center">
              <p className="text-lg text-center leading-relaxed">{card.back}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
