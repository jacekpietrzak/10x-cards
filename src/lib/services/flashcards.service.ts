import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { FlashcardDto, FlashcardsCreateCommand } from "@/lib/types";

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
