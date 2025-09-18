import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface FlashcardsToolbarProps {
  onAddNew: () => void;
  isOperationInProgress?: boolean;
}

export function FlashcardsToolbar({
  onAddNew,
  isOperationInProgress = false,
}: FlashcardsToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-muted-foreground">
          Manage your flashcards
        </h2>
      </div>
      <Button
        onClick={onAddNew}
        className="gap-2 cursor-pointer transition-all duration-200  hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
        disabled={isOperationInProgress}
      >
        <Plus className="h-4 w-4" />
        Add flashcard
      </Button>
    </div>
  );
}
