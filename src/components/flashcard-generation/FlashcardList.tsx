import { FlashcardListItem } from "./FlashcardListItem";
import type { FlashcardProposalDto } from "@/lib/types";

interface FlashcardListProps {
  flashcards: FlashcardProposalDto[];
  onAccept: (flashcard: FlashcardProposalDto) => void;
  onReject: (flashcard: FlashcardProposalDto) => void;
  onEdit: (flashcard: FlashcardProposalDto) => void;
}

export function FlashcardList({
  flashcards,
  onAccept,
  onReject,
  onEdit,
}: FlashcardListProps) {
  if (!flashcards.length) {
    return null;
  }

  return (
    <div className="space-y-4 mt-8">
      {flashcards.map((flashcard) => (
        <FlashcardListItem
          key={flashcard.id}
          flashcard={flashcard}
          onAccept={onAccept}
          onReject={onReject}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
