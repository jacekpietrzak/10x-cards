import { NextRequest, NextResponse } from "next/server";
import { createClient, getAuthenticatedUserId } from "@/utils/supabase/server";
import { z } from "zod";
import { getGenerationById } from "@/lib/services/generation.service";
import { isFeatureEnabled } from "@/lib/features";

// Validation schema for the generation ID parameter
// Ensures the ID is a positive integer
const idSchema = z.string().transform((val, ctx) => {
  const parsed = parseInt(val, 10);
  if (isNaN(parsed) || parsed <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "ID must be a positive integer",
    });
    return z.NEVER;
  }
  return parsed;
});

/**
 * GET /api/generations/{id}
 *
 * Retrieves detailed information about a specific flashcard generation for the authenticated user.
 * Includes the generation metadata and all associated flashcards.
 *
 * @param request - HTTP request (not used, but required by Next.js API route signature)
 * @param context - Route context containing the generation ID parameter
 * @param context.params.id - The generation ID to retrieve (must be a positive integer)
 *
 * @returns JSON response with generation details and flashcards
 *
 * @example
 * GET /api/generations/123
 *
 * Response:
 * {
 *   "id": 123,
 *   "user_id": "user-uuid",
 *   "model": "openai/gpt-4o-mini",
 *   "generated_count": 5,
 *   "accepted_unedited_count": 3,
 *   "accepted_edited_count": 1,
 *   "source_text_hash": "abc123...",
 *   "source_text_length": 2500,
 *   "generation_duration": 3500,
 *   "created_at": "2024-01-01T10:00:00Z",
 *   "updated_at": "2024-01-01T10:05:00Z",
 *   "flashcards": [
 *     {
 *       "id": 1,
 *       "front": "What is React?",
 *       "back": "A JavaScript library for building user interfaces",
 *       "source": "ai-full",
 *       "generation_id": 123,
 *       "created_at": "2024-01-01T10:00:00Z",
 *       "updated_at": "2024-01-01T10:00:00Z"
 *     }
 *   ]
 * }
 *
 * @throws {400} When the ID parameter is invalid (not a positive integer)
 * @throws {401} When the user is not authenticated
 * @throws {404} When the generation doesn't exist or doesn't belong to the user
 * @throws {500} When database or internal server error occurs
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isFeatureEnabled("aiGeneration")) {
    return NextResponse.json(
      { error: "AI generation feature is currently disabled" },
      { status: 503 },
    );
  }

  try {
    const supabase = await createClient();

    // Authenticate user
    const authResult = await getAuthenticatedUserId();

    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error.message },
        { status: authResult.error.status },
      );
    }

    // 3. Walidacja parametru id
    const { id: rawId } = await context.params;
    const parseResult = idSchema.safeParse(rawId);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid ID parameter",
          details: parseResult.error.errors[0].message,
        },
        { status: 400 },
      );
    }

    const id = parseResult.data;

    // 4. Wywołanie serwisu do pobrania generacji
    const generation = await getGenerationById(id, authResult.userId, supabase);

    // 5. Sprawdzenie czy generacja istnieje
    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(generation, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/generations/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
