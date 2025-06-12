import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { FlashcardDto, FlashcardsCreateCommand } from "@/lib/types";
import type { FlashcardsQueryParams } from "@/lib/schemas/flashcards";

export async function createFlashcards(
    command: FlashcardsCreateCommand,
    userId: string,
    supabase: SupabaseClient<Database>,
): Promise<{ flashcards: FlashcardDto[] }> {
    try {
        // Map command to database insert format
        const toInsert = command.flashcards.map((f) => ({
            ...f,
            user_id: userId,
        }));

        // Insert flashcards and return created records
        const { data, error } = await supabase
            .from("flashcards")
            .insert(toInsert)
            .select(
                "id, front, back, source, generation_id, created_at, updated_at",
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
    const { page, limit, sort, order, source, generation_id } = params;

    const offset = (page - 1) * limit;

    // Build base query scoped to the current user
    let query = supabase
        .from("flashcards")
        .select(
            "id, front, back, source, generation_id, created_at, updated_at",
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
            "id, front, back, source, generation_id, created_at, updated_at",
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
