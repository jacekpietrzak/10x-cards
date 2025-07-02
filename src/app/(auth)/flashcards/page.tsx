"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FlashcardsToolbar } from "@/components/flashcards/FlashcardsToolbar";
import { FlashcardsDataTable } from "@/components/flashcards/FlashcardsDataTable";
import { FlashcardFormModal } from "@/components/flashcards/FlashcardFormModal";
import { DeleteConfirmationDialog } from "@/components/flashcards/DeleteConfirmationDialog";
import type {
  FlashcardDto,
  PaginationDto,
  FlashcardsListResponseDto,
  FlashcardCreateDto,
  FlashcardUpdateDto,
  FlashcardsCreateCommand,
  FlashcardViewModel,
} from "@/lib/types";

export default function FlashcardsPage() {
  // State management
  const [flashcards, setFlashcards] = useState<FlashcardDto[]>([]);
  const [pagination, setPagination] = useState<PaginationDto>({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingFlashcard, setEditingFlashcard] =
    useState<FlashcardViewModel | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [deletingFlashcardId, setDeletingFlashcardId] = useState<number | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Fetch flashcards from API
  const fetchFlashcards = async (page: number = 1, limit: number = 10) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/flashcards?page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch flashcards");
      }

      const data: FlashcardsListResponseDto = await response.json();
      setFlashcards(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while fetching flashcards"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchFlashcards(pagination.page, pagination.limit);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle pagination changes
  const handlePageChange = (page: number, limit: number) => {
    setPagination((prev) => ({ ...prev, page, limit }));
    fetchFlashcards(page, limit);
  };

  // Handle adding new flashcard
  const handleAddNew = () => {
    setEditingFlashcard(null);
    setIsModalOpen(true);
  };

  // Handle editing flashcard
  const handleEdit = (flashcard: FlashcardDto) => {
    setEditingFlashcard({
      id: flashcard.id,
      front: flashcard.front,
      back: flashcard.back,
    });
    setIsModalOpen(true);
  };

  // Handle delete initiation
  const handleDelete = (flashcardId: number) => {
    setDeletingFlashcardId(flashcardId);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingFlashcard(null);
  };

  // Handle form submit (create or update)
  const handleSubmit = async (
    data: FlashcardCreateDto | FlashcardUpdateDto,
    id?: number
  ) => {
    try {
      if (id) {
        // Update existing flashcard
        const response = await fetch(`/api/flashcards/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error("Failed to update flashcard");
        }
      } else {
        // Create new flashcard
        const createCommand: FlashcardsCreateCommand = {
          flashcards: [data as FlashcardCreateDto],
        };

        const response = await fetch("/api/flashcards", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createCommand),
        });

        if (!response.ok) {
          throw new Error("Failed to create flashcard");
        }
      }

      // Refresh data and close modal
      await fetchFlashcards(pagination.page, pagination.limit);
      handleModalClose();

      // Show success toast
      if (id) {
        toast.success("Fiszka została zaktualizowana");
      } else {
        toast.success("Nowa fiszka została dodana");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Wystąpił błąd podczas zapisywania";
      toast.error(`Błąd: ${errorMessage}`);
      console.error("Error saving flashcard:", err);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingFlashcardId) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/flashcards/${deletingFlashcardId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete flashcard");
      }

      // Refresh data
      await fetchFlashcards(pagination.page, pagination.limit);

      // Show success toast
      toast.success("Fiszka została usunięta");

      // Close dialog after successful operation
      setDeletingFlashcardId(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Wystąpił błąd podczas usuwania";
      toast.error(`Błąd: ${errorMessage}`);
      console.error("Error deleting flashcard:", err);
      setDeletingFlashcardId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle delete dialog close
  const handleDeleteClose = () => {
    // Don't allow closing during delete operation
    if (isDeleting) return;
    setDeletingFlashcardId(null);
  };

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Moje fiszki</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="text-red-600 font-medium mb-2">Wystąpił błąd</div>
            <div className="text-red-600 text-sm mb-4">{error}</div>
            <button
              onClick={() => fetchFlashcards(pagination.page, pagination.limit)}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 cursor-pointer hover:shadow-md"
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Moje fiszki</h1>
        <p className="text-muted-foreground">
          Zarządzaj swoimi fiszkami - dodawaj, edytuj i usuwaj.
        </p>
      </div>

      <FlashcardsToolbar
        onAddNew={handleAddNew}
        isOperationInProgress={isDeleting}
      />

      <FlashcardsDataTable
        data={flashcards}
        pagination={pagination}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPageChange={handlePageChange}
        isOperationInProgress={isDeleting}
      />

      <FlashcardFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        initialData={editingFlashcard}
      />

      <DeleteConfirmationDialog
        isOpen={deletingFlashcardId !== null}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
}
