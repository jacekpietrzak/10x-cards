import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { DEFAULT_USER_ID } from "@/utils/supabase/server";
import { createFlashcards } from "@/lib/services/flashcards.service";
import type { FlashcardsCreateCommand, Source } from "@/lib/types";

// Validation functions
const validateGenerationId = (
    source: Source,
    generationId: number | null,
): boolean => {
    if (source === "manual") {
        return generationId === null;
    }
    if (source === "ai-full" || source === "ai-edited") {
        return generationId !== null;
    }
    return false;
};

// Zod schema for single flashcard validation
const flashcardSchema = z.object({
    front: z.string().max(200, "Front text cannot exceed 200 characters"),
    back: z.string().max(500, "Back text cannot exceed 500 characters"),
    source: z.enum(["ai-full", "ai-edited", "manual"] as const),
    generation_id: z.number().nullable(),
}).refine((data) => validateGenerationId(data.source, data.generation_id), {
    message:
        "generation_id must be null for manual source and required for AI sources",
    path: ["generation_id"],
});

// Schema for the entire request body
const createFlashcardsSchema = z.object({
    flashcards: z.array(flashcardSchema)
        .min(1, "At least one flashcard is required")
        .max(100, "Maximum 100 flashcards allowed per request"),
});

export async function POST(request: Request) {
    try {
        // Parse request body
        const body = await request.json();

        // Validate request body against schema
        const result = createFlashcardsSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues },
                { status: 400 },
            );
        }

        // Create Supabase client
        const supabase = await createClient();

        // Create flashcards using service
        const command = result.data as FlashcardsCreateCommand;
        const response = await createFlashcards(
            command,
            DEFAULT_USER_ID,
            supabase,
        );

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        console.error("Error in POST /api/flashcards:", error);
        return NextResponse.json(
            { error: "An error occurred while creating flashcards." },
            { status: 500 },
        );
    }
}
