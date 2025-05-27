import { FlashcardGenerationView } from "@/components/flashcard-generation/FlashcardGenerationView";

export const metadata = {
  title: "Generate Flashcards - 10xCards",
  description: "Generate flashcards from your text using AI",
};

export default function GeneratePage() {
  return <FlashcardGenerationView />;
}
