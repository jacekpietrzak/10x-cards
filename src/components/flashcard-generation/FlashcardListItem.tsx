"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Pencil } from "lucide-react";
import type { FlashcardProposalDto } from "@/lib/types";

interface FlashcardListItemProps {
  flashcard: FlashcardProposalDto;
  onAccept: (flashcard: FlashcardProposalDto) => void;
  onReject: (flashcard: FlashcardProposalDto) => void;
  onEdit: (flashcard: FlashcardProposalDto) => void;
}

export function FlashcardListItem({
  flashcard,
  onAccept,
  onReject,
  onEdit,
}: FlashcardListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedFront, setEditedFront] = useState(flashcard.front);
  const [editedBack, setEditedBack] = useState(flashcard.back);

  const handleSaveEdit = () => {
    if (editedFront.length <= 200 && editedBack.length <= 500) {
      onEdit({
        ...flashcard,
        front: editedFront,
        back: editedBack,
      });
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedFront(flashcard.front);
    setEditedBack(flashcard.back);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardContent className="flex flex-col justify-between h-full">
        {isEditing ? (
          <div className="flex flex-col gap-4">
            <div>
              <div className="font-medium text-sm text-muted-foreground mb-1">
                Front
              </div>
              <Textarea
                value={editedFront}
                onChange={(e) => setEditedFront(e.target.value)}
                placeholder="Front side"
                className="resize-none "
                maxLength={200}
              />
              <div className="text-sm text-muted-foreground mt-1">
                {editedFront.length}/200 characters
              </div>
            </div>
            <div>
              <div className="font-medium text-sm text-muted-foreground mb-1">
                Back
              </div>
              <Textarea
                value={editedBack}
                onChange={(e) => setEditedBack(e.target.value)}
                placeholder="Back side"
                className="resize-none"
                maxLength={500}
              />
              <div className="text-sm text-muted-foreground mt-1">
                {editedBack.length}/500 characters
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>Save</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              <div>
                <div className="font-medium text-sm text-muted-foreground mb-1">
                  Front
                </div>
                <div className="p-3 bg-muted rounded-md">{flashcard.front}</div>
              </div>
              <div>
                <div className="font-medium text-sm text-muted-foreground mb-1">
                  Back
                </div>
                <div className="p-3 bg-muted rounded-md">{flashcard.back}</div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReject(flashcard)}
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => onAccept(flashcard)}
              >
                <Check className="h-4 w-4 mr-1" />
                Accept
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
