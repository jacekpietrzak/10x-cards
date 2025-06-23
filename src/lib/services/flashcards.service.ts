import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type {
    FlashcardDto,
    FlashcardReviewDto,
    FlashcardsCreateCommand,
    FlashcardUpdateDto,
} from "@/lib/types";
import type { FlashcardsQueryParams } from "@/lib/schemas/flashcards";

export async function createFlashcards(
    command: FlashcardsCreateCommand,
    userId: string,
    supabase: SupabaseClient<Database>,
): Promise<{ flashcards: FlashcardDto[] }> {
    try {
        // Map command to database insert format with FSRS defaults for new cards
        const now = new Date();
        const toInsert = command.flashcards.map((f) => ({
            ...f,
            user_id: userId,
            // Set FSRS defaults for new cards to make them immediately available for learning
            stability: null, // Will be set by FSRS algorithm on first review
            difficulty: null, // Will be set by FSRS algorithm on first review
            due: now.toISOString(), // Available for learning immediately
            lapses: 0, // Start with no lapses
            state: 0, // State.New
            last_review: null, // No previous review
        }));

        // Insert flashcards and return created records
        const { data, error } = await supabase
            .from("flashcards")
            .insert(toInsert)
            .select(
                "id, front, back, source, generation_id, created_at, updated_at, stability, difficulty, due, lapses, state, last_review",
            );

        if (error || !data) {
            console.error("Error inserting flashcards:", error);
            throw new Error(error?.message || "Insert failed");
        }

        return { flashcards: data };
    } catch (err) {
        console.error("Error in createFlashcards:", err);
        throw err;
    }
}

/**
 * Retrieves a paginated list of flashcards for a specific user.
 *
 * @param userId - The ID of the user whose flashcards should be fetched.
 * @param params - Validated and parsed query parameters controlling pagination, sorting and filtering.
 * @param supabase - An instance of Supabase client.
 *
 * @returns An object containing flashcard DTOs and pagination metadata.
 * @throws When the Supabase query returns an error.
 */
export async function listFlashcards(
    userId: string,
    params: FlashcardsQueryParams,
    supabase: SupabaseClient<Database>,
): Promise<
    {
        data: FlashcardDto[];
        pagination: { page: number; limit: number; total: number };
    }
> {
    const { page, limit, sort, order, source, generation_id, due_before } =
        params;

    const offset = (page - 1) * limit;

    // Build base query scoped to the current user
    let query = supabase
        .from("flashcards")
        .select(
            "id, front, back, source, generation_id, created_at, updated_at, stability, difficulty, due, lapses, state, last_review",
            {
                count: "exact",
            },
        )
        .eq("user_id", userId);

    // Optional filters
    if (source) {
        query = query.eq("source", source);
    }

    if (generation_id) {
        query = query.eq("generation_id", generation_id);
    }

    if (due_before) {
        // Filter cards due before the specified date
        // Include both cards with due dates and new cards (state = 0) that might have null due
        query = query.or(`due.lte.${due_before},and(due.is.null,state.eq.0)`);
    }

    // Sorting
    query = query.order(sort, { ascending: order === "asc" });

    // Pagination (Supabase uses 0-based index for range)
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    // PostgREST returns status 416 (Requested Range Not Satisfiable) when the offset
    // exceeds the number of available rows. Supabase JS may expose this scenario with
    // different `code` values depending on version (e.g., "416" or "PGRST116"). We
    // therefore allow any error that clearly relates to an unsatisfiable range.
    const isRangeError = error && (
        error.code === "416" ||
        error.code === "PGRST116" ||
        error.details?.toLowerCase().includes("range") === true ||
        error.message?.toLowerCase().includes("range") === true
    );

    if (error && !isRangeError) {
        console.error("Error fetching flashcards:", error);
        throw new Error(error?.message || "Failed to fetch flashcards");
    }

    return {
        data: data ?? [],
        pagination: {
            page,
            limit,
            total: count ?? 0,
        },
    };
}

/**
 * Fetches a single flashcard belonging to the specified user.
 *
 * @param id - The identifier of the flashcard to retrieve.
 * @param userId - The identifier of the currently authenticated user.
 * @param supabase - Supabase client instance.
 *
 * @returns A `FlashcardDto` if found, otherwise `null` when the flashcard does
 *          not exist or does not belong to the user.
 * @throws  Rethrows any unexpected Supabase errors.
 */
export async function getFlashcardById(
    id: number,
    userId: string,
    supabase: SupabaseClient<Database>,
): Promise<FlashcardDto | null> {
    const { data, error } = await supabase
        .from("flashcards")
        .select(
            "id, front, back, source, generation_id, created_at, updated_at, stability, difficulty, due, lapses, state, last_review",
        )
        .eq("id", id)
        .eq("user_id", userId)
        .single();

    // When the record is not found PostgREST returns error code PGRST116 or 404/"".
    // We treat this as a non-exceptional case and return `null` so that the route
    // handler can translate it into a 404 response.
    const isNotFoundError = error &&
        (error.code === "PGRST116" || error.code === "404");

    if (error && !isNotFoundError) {
        // Log the unexpected error for observability purposes.
        console.error("Error fetching flashcard:", error);
        throw error;
    }

    if (!data || isNotFoundError) {
        return null;
    }

    return data;
}

/**
 * Updates a flashcard belonging to the specified user.
 *
 * @param id - The identifier of the flashcard to update.
 * @param dto - The updated flashcard data.
 * @param userId - The identifier of the currently authenticated user.
 * @param supabase - Supabase client instance.
 *
 * @returns The updated `FlashcardDto` if successful, otherwise `null` when the flashcard
 *          does not exist or does not belong to the user.
 * @throws  Rethrows any unexpected Supabase errors.
 */
export async function updateFlashcard(
    id: number,
    dto: FlashcardUpdateDto,
    userId: string,
    supabase: SupabaseClient<Database>,
): Promise<FlashcardDto | null> {
    try {
        // Remove undefined values to avoid overwriting with null
        const payload = Object.fromEntries(
            Object.entries(dto).filter(([, v]) => v !== undefined),
        ) as FlashcardUpdateDto;

        const { data, error } = await supabase
            .from("flashcards")
            .update(payload)
            .eq("id", id)
            .eq("user_id", userId)
            .select(
                "id, front, back, source, generation_id, created_at, updated_at, stability, difficulty, due, lapses, state, last_review",
            )
            .single();

        const isNotFoundError = error &&
            (error.code === "PGRST116" || error.code === "404");
        const isForeignKeyError = error && error.code === "23503" &&
            error.details?.includes("generation_id");

        if (error && !isNotFoundError) {
            console.error("Error updating flashcard:", error);

            if (isForeignKeyError) {
                throw new Error(
                    "Invalid generation_id: The specified generation does not exist",
                );
            }

            throw error;
        }

        if (!data || isNotFoundError) {
            return null; // Flashcard does not exist or does not belong to user
        }

        return data;
    } catch (err) {
        console.error("Unexpected error in updateFlashcard:", err);
        throw err;
    }
}

/**
 * Deletes a flashcard belonging to the specified user.
 *
 * @param id - The identifier of the flashcard to delete.
 * @param userId - The identifier of the currently authenticated user.
 * @param supabase - Supabase client instance.
 *
 * @returns `true` if the flashcard was successfully deleted, otherwise `false` when the
 *          flashcard does not exist or does not belong to the user.
 * @throws  Rethrows any unexpected Supabase errors.
 */
export async function deleteFlashcard(
    id: number,
    userId: string,
    supabase: SupabaseClient<Database>,
): Promise<boolean> {
    try {
        // First verify that the flashcard exists and belongs to the user
        const { data: existingFlashcard, error: selectError } = await supabase
            .from("flashcards")
            .select("id")
            .eq("id", id)
            .eq("user_id", userId)
            .single();

        const isNotFoundError = selectError &&
            (selectError.code === "PGRST116" || selectError.code === "404");

        if (selectError && !isNotFoundError) {
            console.error("Error verifying flashcard ownership:", selectError);
            throw selectError;
        }

        if (!existingFlashcard || isNotFoundError) {
            return false; // Flashcard does not exist or does not belong to user
        }

        // Delete the flashcard
        const { error: deleteError } = await supabase
            .from("flashcards")
            .delete()
            .eq("id", id);

        if (deleteError) {
            console.error("Error deleting flashcard:", deleteError);
            throw deleteError;
        }

        return true;
    } catch (err) {
        console.error("Unexpected error in deleteFlashcard:", err);
        throw err;
    }
}

/**
 * Updates FSRS parameters for a flashcard after a review session.
 *
 * @param id - The identifier of the flashcard to update.
 * @param userId - The identifier of the currently authenticated user.
 * @param reviewData - The FSRS parameters to update (stability, difficulty, due, lapses, state, last_review).
 * @param supabase - Supabase client instance.
 *
 * @returns The updated `FlashcardDto` if successful, otherwise `null` when the flashcard
 *          does not exist or does not belong to the user.
 * @throws  Rethrows any unexpected Supabase errors.
 */
export async function updateFlashcardReview(
    id: number,
    userId: string,
    reviewData: FlashcardReviewDto,
    supabase: SupabaseClient<Database>,
): Promise<FlashcardDto | null> {
    try {
        // Convert ISO date strings to Date objects for database insertion
        const payload = {
            stability: reviewData.stability,
            difficulty: reviewData.difficulty,
            due: reviewData.due,
            lapses: reviewData.lapses,
            state: reviewData.state,
            last_review: reviewData.last_review,
        };

        const { data, error } = await supabase
            .from("flashcards")
            .update(payload)
            .eq("id", id)
            .eq("user_id", userId)
            .select(
                "id, front, back, source, generation_id, created_at, updated_at, stability, difficulty, due, lapses, state, last_review",
            )
            .single();

        const isNotFoundError = error &&
            (error.code === "PGRST116" || error.code === "404");

        if (error && !isNotFoundError) {
            console.error("Error updating flashcard review data:", error);
            throw error;
        }

        if (!data || isNotFoundError) {
            return null; // Flashcard does not exist or does not belong to user
        }

        return data;
    } catch (err) {
        console.error("Unexpected error in updateFlashcardReview:", err);
        throw err;
    }
}
