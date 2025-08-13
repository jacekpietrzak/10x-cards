import { FlashcardGenerationView } from "@/components/flashcard-generation/FlashcardGenerationView";
import { isFeatureEnabled } from "@/lib/features";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Generate Flashcards - 10xCards",
  description: "Generate flashcards from your text using AI",
};

export default function GeneratePage() {
  if (!isFeatureEnabled("aiGeneration")) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            AI generation feature is currently disabled
          </p>
        </CardContent>
      </Card>
    );
  }

  return <FlashcardGenerationView />;
}
