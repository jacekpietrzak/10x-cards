import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, DEFAULT_USER_ID } from "@/utils/supabase/server";
import {
    GenerateFlashcardsCommand,
    GenerationCreateResponseDto,
} from "@/lib/types";
import { generateFlashcards } from "@/lib/generation.service";

// Validation schema for the request body
const generateFlashcardsSchema = z.object({
    source_text: z.string().min(1000, "Text must be at least 1000 characters")
        .max(10000, "Text cannot exceed 10000 characters"),
});

export async function POST(request: Request) {
    const body = await request.json();
    const parsed = generateFlashcardsSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.errors.map((e) => e.message).join(", ") },
            { status: 400 },
        );
    }

    try {
        const command: GenerateFlashcardsCommand = parsed.data;
        const supabase = await createClient();
        const result = await generateFlashcards(
            command,
            DEFAULT_USER_ID,
            supabase,
        );

        return NextResponse.json(result, { status: 201 });
    } catch (err) {
        console.error("Error generating flashcards:", err);
        return NextResponse.json(
            { error: "An error occurred while generating flashcards." },
            { status: 500 },
        );
    }
}
