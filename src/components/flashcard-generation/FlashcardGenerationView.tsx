"use client";
import { useState, useRef } from "react";
import { TextInputArea } from "./TextInputArea";
import { FlashcardList } from "./FlashcardList";
import { SkeletonLoader } from "./SkeletonLoader";
import { BulkSaveButton } from "./BulkSaveButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useApiRequest } from "@/hooks/useApiRequest";
import type {
  FlashcardProposalDto,
  GenerateFlashcardsCommand,
  FlashcardsCreateCommand,
  GenerationCreateResponseDto,
} from "@/lib/types";

export function FlashcardGenerationView() {
  const [text, setText] = useState("");
  const [generationId, setGenerationId] = useState<number | null>(null);
  const [flashcardProposals, setFlashcardProposals] = useState<
    FlashcardProposalDto[]
  >([]);
  const [acceptedFlashcards, setAcceptedFlashcards] = useState<
    FlashcardProposalDto[]
  >([]);

  const generateRequest = useApiRequest<GenerationCreateResponseDto>();
  const saveRequest = useApiRequest<void>();

  // Refs for managing focus
  const generateButtonRef = useRef<HTMLButtonElement>(null);
  const flashcardsListRef = useRef<HTMLDivElement>(null);

  const handleTextChange = (value: string) => {
    setText(value);
  };

  const handleGenerateClick = async () => {
    try {
      const command: GenerateFlashcardsCommand = {
        source_text: text,
      };

      setFlashcardProposals([]);
      setAcceptedFlashcards([]);
      setGenerationId(null);

      const { data } = await generateRequest.request("/api/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      // Add unique IDs to the flashcard proposals
      const flashcardsWithIds = data.flashcards_proposals.map(
        (f: FlashcardProposalDto) => ({
          ...f,
          id: crypto.randomUUID(),
        })
      );

      setGenerationId(data.generation_id);
      setFlashcardProposals(flashcardsWithIds);

      // Move focus to the flashcards list for better keyboard navigation
      if (flashcardsListRef.current) {
        flashcardsListRef.current.focus();
      }
    } catch {
      // Error is already handled by useApiRequest
      generateButtonRef.current?.focus();
    }
  };

  const handleAcceptFlashcard = (flashcard: FlashcardProposalDto) => {
    setAcceptedFlashcards((prev) => [...prev, flashcard]);
    setFlashcardProposals((prev) => prev.filter((f) => f.id !== flashcard.id));
    toast.success("Flashcard accepted");
  };

  const handleRejectFlashcard = (flashcard: FlashcardProposalDto) => {
    setFlashcardProposals((prev) => prev.filter((f) => f.id !== flashcard.id));
    toast.info("Flashcard rejected");
  };

  const handleEditFlashcard = (editedFlashcard: FlashcardProposalDto) => {
    setFlashcardProposals((prev) =>
      prev.map((f) => {
        // Compare the original values to find the flashcard to update
        if (f.id === editedFlashcard.id) {
          return { ...editedFlashcard, source: "ai-edited" as const };
        }
        return { ...f }; // Return a new object to prevent reference issues
      })
    );
    toast.success("Flashcard updated");
  };

  const handleSaveFlashcards = async () => {
    if (!generationId || !acceptedFlashcards.length) return;

    try {
      const command: FlashcardsCreateCommand = {
        flashcards: acceptedFlashcards.map((f) => ({
          front: f.front,
          back: f.back,
          source: f.source,
          generation_id: generationId,
        })),
      };

      await saveRequest.request("/api/flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      // Reset the form
      setText("");
      setFlashcardProposals([]);
      setAcceptedFlashcards([]);
      setGenerationId(null);

      // Return focus to text input area
      generateButtonRef.current?.focus();

      toast.success(
        `${acceptedFlashcards.length} flashcard${
          acceptedFlashcards.length === 1 ? "" : "s"
        } saved successfully.`
      );
    } catch {
      // Error is already handled by useApiRequest
    }
  };

  const isGenerateDisabled =
    text.length < 1000 || text.length > 10000 || generateRequest.isLoading;

  return (
    <main
      className="container mx-auto"
      role="main"
      aria-label="Flashcard Generation"
    >
      <Card>
        <CardHeader>
          <CardTitle>Generate Flashcards</CardTitle>
        </CardHeader>
        <CardContent>
          <TextInputArea
            value={text}
            onChange={handleTextChange}
            disabled={generateRequest.isLoading}
            aria-label="Text to generate flashcards from"
            aria-invalid={generateRequest.error ? "true" : "false"}
          />

          {generateRequest.error && (
            <div
              className="mt-4 p-4 bg-destructive/15 text-destructive rounded-md"
              role="alert"
              aria-live="polite"
            >
              {generateRequest.error}
            </div>
          )}

          <div className="mt-6">
            <Button
              ref={generateButtonRef}
              data-test-id="generate-flashcards-button"
              onClick={handleGenerateClick}
              disabled={isGenerateDisabled}
              className="w-full sm:w-auto"
              aria-busy={generateRequest.isLoading}
            >
              {generateRequest.isLoading
                ? "Generating..."
                : "Generate Flashcards"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generateRequest.isLoading && <SkeletonLoader />}

      {!generateRequest.isLoading && (
        <>
          <div
            ref={flashcardsListRef}
            tabIndex={-1}
            role="region"
            aria-label="Generated Flashcards"
          >
            <FlashcardList
              flashcards={flashcardProposals}
              onAccept={handleAcceptFlashcard}
              onReject={handleRejectFlashcard}
              onEdit={handleEditFlashcard}
            />
          </div>

          {acceptedFlashcards.length > 0 && (
            <div className="mt-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>
                    Accepted Flashcards ({acceptedFlashcards.length})
                  </CardTitle>
                  <BulkSaveButton
                    flashcards={acceptedFlashcards}
                    onSave={handleSaveFlashcards}
                    disabled={!generationId || saveRequest.isLoading}
                    isLoading={saveRequest.isLoading}
                  />
                </CardHeader>
                <CardContent>
                  <div role="region" aria-label="Accepted Flashcards" data-test-id="accepted-flashcards-container">
                    <FlashcardList
                      flashcards={acceptedFlashcards}
                      onAccept={(flashcard) => {
                        setAcceptedFlashcards((prev) =>
                          prev.filter((f) => f.id !== flashcard.id)
                        );
                        setFlashcardProposals((prev) => [...prev, flashcard]);
                        toast.info("Flashcard moved back to proposals");
                      }}
                      onReject={(flashcard) => {
                        setAcceptedFlashcards((prev) =>
                          prev.filter((f) => f.id !== flashcard.id)
                        );
                        toast.info("Flashcard removed from accepted list");
                      }}
                      onEdit={(editedFlashcard) => {
                        setAcceptedFlashcards((prev) =>
                          prev.map((f) =>
                            f.id === editedFlashcard.id
                              ? {
                                  ...editedFlashcard,
                                  source: "ai-edited" as const,
                                }
                              : f
                          )
                        );
                        toast.success("Accepted flashcard updated");
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </main>
  );
}
