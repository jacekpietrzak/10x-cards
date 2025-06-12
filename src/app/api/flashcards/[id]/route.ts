import { type NextRequest, NextResponse } from "next/server";
import { createClient, getAuthenticatedUserId } from "@/utils/supabase/server";
import { flashcardIdParamSchema } from "@/lib/schemas/flashcardsParams";
import { getFlashcardById } from "@/lib/services/flashcards.service";
import { flashcardUpdateSchema } from "@/lib/schemas/flashcards";
import { updateFlashcard } from "@/lib/services/flashcards.service";

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    // 1. Validate path parameter - await params in Next.js 15
    const params = await context.params;
    const parsed = flashcardIdParamSchema.safeParse(params);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues }, {
            status: 400,
        });
    }
    const { id } = parsed.data;

    try {
        // 2. Authenticate user
        const supabase = await createClient();
        const authResult = await getAuthenticatedUserId(supabase);

        if (authResult.error) {
            return NextResponse.json(
                { error: authResult.error.message },
                { status: authResult.error.status },
            );
        }

        // 3. Fetch flashcard scoped to the user
        const flashcard = await getFlashcardById(
            id,
            authResult.userId,
            supabase,
        );

        if (!flashcard) {
            return NextResponse.json(
                { error: "Flashcard not found" },
                { status: 404 },
            );
        }

        return NextResponse.json(flashcard, { status: 200 });
    } catch (err) {
        console.error("Unexpected error in GET /flashcards/[id]", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    // 1. Validate and parse the path parameter - await params in Next.js 15
    const params = await context.params;
    const idParse = flashcardIdParamSchema.safeParse(params);
    if (!idParse.success) {
        return NextResponse.json({ error: idParse.error.issues }, {
            status: 400,
        });
    }
    const { id } = idParse.data;

    // 2. Parse and validate request body
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, {
            status: 400,
        });
    }

    const bodyParse = flashcardUpdateSchema.safeParse(body);
    if (!bodyParse.success) {
        console.error("Validation errors:", bodyParse.error.issues);
        return NextResponse.json({ error: bodyParse.error.issues }, {
            status: 400,
        });
    }
    const updateDto = bodyParse.data;

    try {
        // 3. Authenticate user
        const supabase = await createClient();
        const authResult = await getAuthenticatedUserId(supabase);

        if (authResult.error) {
            return NextResponse.json(
                { error: authResult.error.message },
                { status: authResult.error.status },
            );
        }

        console.log("Attempting to update flashcard:", {
            id,
            updateDto,
            userId: authResult.userId,
        });

        // 4. Delegate update logic to service layer
        const updated = await updateFlashcard(
            id,
            updateDto,
            authResult.userId,
            supabase,
        );

        if (!updated) {
            return NextResponse.json(
                { error: "Flashcard not found" },
                { status: 404 },
            );
        }

        return NextResponse.json(updated, { status: 200 });
    } catch (err) {
        console.error("Unexpected error in PUT /flashcards/[id]", err);
        console.error("Error details:", {
            message: err instanceof Error ? err.message : "Unknown error",
            stack: err instanceof Error ? err.stack : undefined,
        });

        // Handle foreign key constraint violations as bad requests
        if (
            err instanceof Error &&
            err.message.includes("Invalid generation_id")
        ) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
