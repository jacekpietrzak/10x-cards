import { useCallback, useEffect, useState } from "react";
import { createEmptyCard, FSRS, Rating, State } from "ts-fsrs";
import { toast } from "sonner";
import type {
    FlashcardDto,
    FlashcardReviewDto,
    FSRSGrade,
    SessionViewModel,
} from "@/lib/types";
import { useApiRequest } from "@/hooks/useApiRequest";

interface FlashcardsResponse {
    data: FlashcardDto[];
}

// Initialize FSRS with default parameters
const fsrs = new FSRS({});

export function useReviewSession() {
    const [state, setState] = useState<SessionViewModel>({
        cardsToReview: [],
        currentCardIndex: 0,
        isAnswerVisible: false,
        sessionState: "loading",
        error: null,
        reviewedCount: 0,
        isSubmittingReview: false,
    });

    const { request } = useApiRequest<FlashcardsResponse>();

    // Helper to convert FlashcardDto to FSRS Card
    const convertToFSRSCard = useCallback((flashcard: FlashcardDto) => {
        // Check if this is essentially a new card (missing critical FSRS parameters)
        const isMissingCriticalParams = !flashcard.last_review ||
            flashcard.state === null ||
            flashcard.stability === null ||
            flashcard.difficulty === null ||
            flashcard.due === null;

        // For new cards or cards missing critical FSRS data, use createEmptyCard with defaults
        if (isMissingCriticalParams) {
            // Use a safe due date - if due is null, schedule for immediate review
            const safeDueDate = flashcard.due && flashcard.due !== null
                ? new Date(flashcard.due)
                : new Date(); // Schedule immediately for new cards

            return createEmptyCard(safeDueDate);
        }

        // For existing cards with all FSRS parameters, construct the card from stored data
        return {
            due: new Date(flashcard.due!), // We know it's not null from the check above
            stability: flashcard.stability!,
            difficulty: flashcard.difficulty!,
            elapsed_days: 0,
            scheduled_days: 0,
            learning_steps: 0,
            reps: 0,
            lapses: flashcard.lapses || 0,
            state: flashcard.state as State,
            last_review: flashcard.last_review
                ? new Date(flashcard.last_review)
                : undefined,
        };
    }, []);

    // Get current card
    const currentCard = state.cardsToReview[state.currentCardIndex] || null;

    // Start session - fetch cards due for review
    const startSession = useCallback(async () => {
        setState((prev) => ({ ...prev, sessionState: "loading", error: null }));

        try {
            const now = new Date().toISOString();
            const params = new URLSearchParams({
                due_before: now,
                limit: "50",
                sort: "due",
                order: "asc",
            });

            const { data: response } = await request(
                `/api/flashcards?${params}`,
                {
                    method: "GET",
                },
            );

            const flashcards = response.data || [];

            // Filter out any cards that somehow have null or invalid due dates
            // This serves as an additional safety check beyond the backend filtering
            const validFlashcards = flashcards.filter((card: FlashcardDto) => {
                try {
                    // Test if we can safely convert this card to FSRS format
                    convertToFSRSCard(card);
                    return true;
                } catch (error) {
                    console.warn(
                        `Skipping card ${card.id} due to invalid FSRS parameters:`,
                        error,
                    );
                    return false;
                }
            });

            if (validFlashcards.length === 0) {
                setState((prev) => ({
                    ...prev,
                    sessionState: "empty",
                    cardsToReview: [],
                }));
            } else {
                setState((prev) => ({
                    ...prev,
                    sessionState: "active",
                    cardsToReview: validFlashcards,
                    currentCardIndex: 0,
                    isAnswerVisible: false,
                }));
            }
        } catch (error) {
            console.error("Error starting session:", error);
            const errorMessage = error instanceof Error
                ? error.message
                : "Wystąpił nieoczekiwany błąd";

            toast.error(`Błąd podczas ładowania sesji: ${errorMessage}`);
            setState((prev) => ({
                ...prev,
                sessionState: "error",
                error: errorMessage,
            }));
        }
    }, [request, convertToFSRSCard]);

    // Show answer
    const showAnswer = useCallback(() => {
        setState((prev) => ({ ...prev, isAnswerVisible: true }));
    }, []);

    // Rate card and move to next
    const rateCard = useCallback(async (rating: FSRSGrade) => {
        if (!currentCard || state.isSubmittingReview) return;

        // Set loading state
        setState((prev) => ({
            ...prev,
            isSubmittingReview: true,
            error: null,
        }));

        try {
            // Convert to FSRS card format
            const fsrsCard = convertToFSRSCard(currentCard);
            const now = new Date();

            // Map FSRSGrade to FSRS Rating
            const ratingMap: Record<FSRSGrade, Rating> = {
                1: Rating.Again,
                2: Rating.Hard,
                3: Rating.Good,
                4: Rating.Easy,
            };

            // Calculate new card state using FSRS algorithm
            const fsrsRating = ratingMap[rating];
            const schedulingCards = fsrs.repeat(fsrsCard, now);

            // Get the specific scheduling result based on rating
            let newCard;
            switch (fsrsRating) {
                case Rating.Again:
                    newCard = schedulingCards[Rating.Again].card;
                    break;
                case Rating.Hard:
                    newCard = schedulingCards[Rating.Hard].card;
                    break;
                case Rating.Good:
                    newCard = schedulingCards[Rating.Good].card;
                    break;
                case Rating.Easy:
                    newCard = schedulingCards[Rating.Easy].card;
                    break;
                default:
                    newCard = schedulingCards[Rating.Good].card;
            }

            // FSRS handles lapses correctly for most cases, but we need to ensure
            // that lapses are incremented when a learned card (state 2 or 3) is rated as "Again"
            let finalLapses = newCard.lapses;

            // If the original card was in Review (2) or Relearning (3) state and user chose "Again",
            // ensure lapses are properly incremented
            if (
                rating === 1 && (fsrsCard.state === 2 || fsrsCard.state === 3)
            ) {
                finalLapses = Math.max(
                    newCard.lapses,
                    (currentCard.lapses || 0) + 1,
                );
            }

            const reviewData: FlashcardReviewDto = {
                stability: newCard.stability,
                difficulty: newCard.difficulty,
                due: newCard.due.toISOString(),
                lapses: finalLapses,
                state: newCard.state,
                last_review: now.toISOString(),
            };

            // Send to API
            await request(`/api/flashcards/${currentCard.id}/review`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(reviewData),
            });

            // Move to next card or finish session
            const nextIndex = state.currentCardIndex + 1;
            const newReviewedCount = state.reviewedCount + 1;

            if (nextIndex >= state.cardsToReview.length) {
                // Session finished
                setState((prev) => ({
                    ...prev,
                    sessionState: "finished",
                    reviewedCount: newReviewedCount,
                    isSubmittingReview: false,
                }));
                toast.success(
                    `Sesja zakończona! Powtórzyłeś ${newReviewedCount} ${
                        newReviewedCount === 1 ? "fiszkę" : "fiszek"
                    }.`,
                );
            } else {
                // Move to next card
                setState((prev) => ({
                    ...prev,
                    currentCardIndex: nextIndex,
                    isAnswerVisible: false,
                    reviewedCount: newReviewedCount,
                    isSubmittingReview: false,
                }));
            }
        } catch (error) {
            console.error("Error rating card:", error);
            const errorMessage = error instanceof Error
                ? error.message
                : "Nie udało się zapisać oceny";

            toast.error(`Błąd podczas zapisywania: ${errorMessage}`);
            setState((prev) => ({
                ...prev,
                error: errorMessage,
                isSubmittingReview: false,
            }));
        }
    }, [
        currentCard,
        state.currentCardIndex,
        state.reviewedCount,
        state.cardsToReview.length,
        state.isSubmittingReview,
        request,
        convertToFSRSCard,
    ]);

    // Start session on mount
    useEffect(() => {
        startSession();
    }, [startSession]);

    return {
        state,
        currentCard,
        showAnswer,
        rateCard,
        startSession,
    };
}
