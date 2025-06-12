import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { flashcardIdParamSchema } from "@/lib/schemas/flashcardsParams";
import { getFlashcardById } from "@/lib/services/flashcards.service";

export async function GET(
    _request: NextRequest,
    context: { params: { id: string } },
) {
    // 1. Validate path parameter
    const parsed = flashcardIdParamSchema.safeParse(context.params);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues }, {
            status: 400,
        });
    }
    const { id } = parsed.data;

    try {
        // 2. Authenticate user
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        // 3. Fetch flashcard scoped to the user
        const flashcard = await getFlashcardById(id, user.id, supabase);

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
