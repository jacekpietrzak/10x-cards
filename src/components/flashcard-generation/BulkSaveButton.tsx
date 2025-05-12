import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import type { FlashcardProposalDto } from "@/lib/types";

interface BulkSaveButtonProps {
  flashcards: FlashcardProposalDto[];
  onSave: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function BulkSaveButton({
  flashcards,
  onSave,
  disabled,
  isLoading,
}: BulkSaveButtonProps) {
  if (!flashcards.length) {
    return null;
  }

  return (
    <Button
      onClick={onSave}
      disabled={disabled || isLoading}
      className="w-full sm:w-auto"
      size="lg"
    >
      <Save className="h-4 w-4 mr-2" />
      {isLoading
        ? "Saving..."
        : `Save ${flashcards.length} Flashcard${
            flashcards.length === 1 ? "" : "s"
          }`}
    </Button>
  );
}
