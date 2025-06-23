import { type NextRequest, NextResponse } from "next/server";
import { createClient, getAuthenticatedUserId } from "@/utils/supabase/server";
import { flashcardIdParamSchema } from "@/lib/schemas/flashcardsParams";
import { flashcardReviewSchema } from "@/lib/schemas/flashcards";
import { updateFlashcardReview } from "@/lib/services/flashcards.service";

/**
 * PUT /api/flashcards/{id}/review
 * Updates FSRS (Free Spaced Repetition Scheduler) parameters for a flashcard after a review session.
 * This endpoint is used by the spaced repetition algorithm to track learning progress.
 */
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    // 1. Validate and parse the path parameter
    const params = await context.params;
    const idParse = flashcardIdParamSchema.safeParse(params);
    if (!idParse.success) {
        return NextResponse.json({
            error: "Invalid flashcard ID",
            details: idParse.error.issues,
        }, { status: 400 });
    }
    const { id } = idParse.data;

    // 2. Parse and validate request body
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({
            error: "Invalid JSON body",
        }, { status: 400 });
    }

    const bodyParse = flashcardReviewSchema.safeParse(body);
    if (!bodyParse.success) {
        console.error("FSRS review validation errors:", bodyParse.error.issues);
        return NextResponse.json({
            error: "Invalid review data",
            details: bodyParse.error.issues,
        }, { status: 400 });
    }
    const reviewData = bodyParse.data;

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

        console.log("Attempting to update flashcard review data:", {
            id,
            reviewData,
            userId: authResult.userId,
        });

        // 4. Update FSRS parameters using service layer
        const updatedFlashcard = await updateFlashcardReview(
            id,
            authResult.userId,
            reviewData,
            supabase,
        );

        if (!updatedFlashcard) {
            return NextResponse.json(
                { error: "Flashcard not found" },
                { status: 404 },
            );
        }

        // 5. Return updated flashcard with FSRS data
        return NextResponse.json(updatedFlashcard, { status: 200 });
    } catch (err) {
        console.error("Unexpected error in PUT /flashcards/[id]/review", err);
        console.error("Error details:", {
            message: err instanceof Error ? err.message : "Unknown error",
            stack: err instanceof Error ? err.stack : undefined,
        });

        return NextResponse.json({
            error: "Failed to update flashcard review data",
        }, { status: 500 });
    }
}
