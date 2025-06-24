// src/types.ts
import type { Database } from "../db/database.types";

// ------------------------------------------------------------------------------------------------
// Aliases for base database types extracted from the Database model definitions
// ------------------------------------------------------------------------------------------------
export type Flashcard = Database["public"]["Tables"]["flashcards"]["Row"];
export type FlashcardInsert =
    Database["public"]["Tables"]["flashcards"]["Insert"];
export type Generation = Database["public"]["Tables"]["generations"]["Row"];
export type GenerationErrorLog =
    Database["public"]["Tables"]["generation_error_logs"]["Row"];

// ------------------------------------------------------------------------------------------------
// Navigation Types
// ------------------------------------------------------------------------------------------------

// Typ dla elementów nawigacji publicznej
export interface PublicNavItem {
    label: string;
    href: string;
}

// Typ dla elementów nawigacji prywatnej
export interface NavItem {
    label: string;
    href: string;
}

// ------------------------------------------------------------------------------------------------
// 1. Flashcard DTO
//    Represents a flashcard as returned by the API endpoints (GET /flashcards, GET /flashcards/{id})
//    Updated to include FSRS fields for spaced repetition
// ------------------------------------------------------------------------------------------------
export type FlashcardDto = Pick<
    Flashcard,
    | "id"
    | "front"
    | "back"
    | "source"
    | "generation_id"
    | "created_at"
    | "updated_at"
    | "stability"
    | "difficulty"
    | "due"
    | "lapses"
    | "state"
    | "last_review"
>;

// ------------------------------------------------------------------------------------------------
// 2. Flashcard Review DTO
//    Used in PUT /flashcards/{id}/review endpoint to update FSRS parameters after review session
// ------------------------------------------------------------------------------------------------
export interface FlashcardReviewDto {
    stability: number;
    difficulty: number;
    due: string; // ISO 8601 date string
    lapses: number;
    state: number;
    last_review: string; // ISO 8601 date string
}

// ------------------------------------------------------------------------------------------------
// 3. Pagination DTO
//    Contains pagination details used in list responses
// ------------------------------------------------------------------------------------------------
export interface PaginationDto {
    page: number;
    limit: number;
    total: number;
}

// ------------------------------------------------------------------------------------------------
// 4. Flashcards List Response DTO
//    Combines an array of flashcards with pagination metadata (GET /flashcards)
// ------------------------------------------------------------------------------------------------
export interface FlashcardsListResponseDto {
    data: FlashcardDto[];
    pagination: PaginationDto;
}

// ------------------------------------------------------------------------------------------------
// 5. Flashcard Create DTO & Command Model
//    Used in the POST /flashcards endpoint to create one or more flashcards.
//    Validation rules:
//      - front: maximum length 200 characters
//      - back: maximum length 500 characters
//      - source: must be one of "ai-full", "ai-edited", or "manual"
//      - generation_id: required for "ai-full" and "ai-edited", must be null for "manual"
// ------------------------------------------------------------------------------------------------
export type Source = "ai-full" | "ai-edited" | "manual";

export interface FlashcardCreateDto {
    front: string;
    back: string;
    source: Source;
    generation_id: number | null;
}

export interface FlashcardsCreateCommand {
    flashcards: FlashcardCreateDto[];
}

// ------------------------------------------------------------------------------------------------
// 6. Flashcard Update DTO (Command Model)
//    For the PUT /flashcards/{id} endpoint to update existing flashcards.
//    This model is a partial update of flashcard fields.
// ------------------------------------------------------------------------------------------------
export type FlashcardUpdateDto = Partial<{
    front: string;
    back: string;
    source: "ai-full" | "ai-edited" | "manual";
    generation_id: number | null;
}>;

// ------------------------------------------------------------------------------------------------
// 7. Generate Flashcards Command
//    Used in the POST /generations endpoint to initiate the AI flashcard generation process.
//    The "source_text" must be between 1000 and 10000 characters.
// ------------------------------------------------------------------------------------------------
export interface GenerateFlashcardsCommand {
    source_text: string;
}

// ------------------------------------------------------------------------------------------------
// 8. Flashcard Proposal DTO
//    Represents a single flashcard proposal generated from AI, always with source "ai-full".
// ------------------------------------------------------------------------------------------------
export interface FlashcardProposalDto {
    id?: string;
    front: string;
    back: string;
    source: "ai-full" | "ai-edited";
}

// ------------------------------------------------------------------------------------------------
// 9. Generation Create Response DTO
//    This type describes the response from the POST /generations endpoint.
// ------------------------------------------------------------------------------------------------
export interface GenerationCreateResponseDto {
    generation_id: number;
    flashcards_proposals: FlashcardProposalDto[];
    generated_count: number;
}

// ------------------------------------------------------------------------------------------------
// 10. Generation Detail DTO
//    Provides detailed information for a generation request (GET /generations/{id}),
//    including metadata from the generations table and optionally, the associated flashcards.
// ------------------------------------------------------------------------------------------------
export type GenerationDetailDto = Generation & {
    flashcards?: FlashcardDto[];
};

// ------------------------------------------------------------------------------------------------
// 11. Generation Error Log DTO
//     Represents an error log entry for the AI flashcard generation process (GET /generation-error-logs).
// ------------------------------------------------------------------------------------------------
export type GenerationErrorLogDto = Pick<
    GenerationErrorLog,
    | "id"
    | "error_code"
    | "error_message"
    | "model"
    | "source_text_hash"
    | "source_text_length"
    | "created_at"
    | "user_id"
>;

// ------------------------------------------------------------------------------------------------
// 12. Generation DTO
//     Represents generation metadata for the GET /generations endpoint (list view).
//     Contains only the essential fields without the full detail.
// ------------------------------------------------------------------------------------------------
export type GenerationDto = Pick<
    Generation,
    | "id"
    | "model"
    | "generated_count"
    | "accepted_unedited_count"
    | "accepted_edited_count"
    | "source_text_hash"
    | "source_text_length"
    | "generation_duration"
    | "created_at"
    | "updated_at"
>;

// ------------------------------------------------------------------------------------------------
// 13. Generations List Response DTO
//     Combines an array of generation metadata with pagination details (GET /generations).
// ------------------------------------------------------------------------------------------------
export interface GenerationsListResponseDto {
    data: GenerationDto[];
    pagination: PaginationDto;
}

// ------------------------------------------------------------------------------------------------
// 14. Delete Flashcard Response DTO
//     Response type for DELETE /flashcards/{id} endpoint
// ------------------------------------------------------------------------------------------------
export interface DeleteFlashcardResponseDto {
    message: string;
}

// ------------------------------------------------------------------------------------------------
// 15. Flashcard View Model
//     Represents flashcard data in forms and UI components
// ------------------------------------------------------------------------------------------------
export interface FlashcardViewModel {
    id?: number;
    front: string;
    back: string;
}

// ------------------------------------------------------------------------------------------------
// 16. FSRS Grade
//     Represents rating values for the FSRS (Free Spaced Repetition Scheduler) algorithm
//     1: Again, 2: Hard, 3: Good, 4: Easy
// ------------------------------------------------------------------------------------------------
export type FSRSGrade = 1 | 2 | 3 | 4;

// ------------------------------------------------------------------------------------------------
// 17. Session View Model
//     Represents the state of a review session for the session learning view
// ------------------------------------------------------------------------------------------------
export interface SessionViewModel {
    cardsToReview: FlashcardDto[];
    currentCardIndex: number;
    isAnswerVisible: boolean;
    sessionState: "loading" | "active" | "finished" | "empty" | "error";
    error: string | null;
    reviewedCount: number;
    isSubmittingReview: boolean;
}
