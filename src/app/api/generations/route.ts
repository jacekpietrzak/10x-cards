import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getAuthenticatedUserId } from "@/utils/supabase/server";
import { GenerateFlashcardsCommand } from "@/lib/types";
import {
  generateFlashcards,
  listGenerations,
} from "@/lib/services/generation.service";
import { isFeatureEnabled } from "@/lib/features";

// Validation schema for the request body
const generateFlashcardsSchema = z.object({
  source_text: z
    .string()
    .min(1000, "Text must be at least 1000 characters")
    .max(10000, "Text cannot exceed 10000 characters"),
});

// Validation schema for query parameters in GET request
const listGenerationsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

/**
 * POST /api/generations
 *
 * Creates a new flashcard generation request using AI.
 *
 * @param request - HTTP request containing source text
 * @returns JSON response with generation results and flashcard proposals
 */
export async function POST(request: Request) {
  if (!isFeatureEnabled("aiGeneration")) {
    return NextResponse.json(
      { error: "AI generation feature is currently disabled" },
      { status: 503 },
    );
  }

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

    const authResult = await getAuthenticatedUserId();
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error.message },
        { status: authResult.error.status },
      );
    }

    const result = await generateFlashcards(
      command,
      authResult.userId,
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

/**
 * GET /api/generations
 *
 * Retrieves a paginated list of flashcard generation requests for the current user.
 * Supports pagination through query parameters.
 *
 * NOTE: Currently in development mode using DEFAULT_USER_ID.
 * For production, uncomment authentication code to use real user sessions.
 *
 * @param request - HTTP request with optional query parameters
 * @param request.searchParams.page - Page number (default: 1, minimum: 1)
 * @param request.searchParams.limit - Items per page (default: 10, minimum: 1, maximum: 100)
 *
 * @returns JSON response with paginated generation data
 *
 * @example
 * GET /api/generations?page=1&limit=10
 *
 * Response:
 * {
 *   "data": [
 *     {
 *       "id": 1,
 *       "model": "openai/gpt-4o-mini",
 *       "generated_count": 5,
 *       "accepted_unedited_count": 3,
 *       "accepted_edited_count": 1,
 *       "source_text_hash": "abc123...",
 *       "source_text_length": 2500,
 *       "generation_duration": 3500,
 *       "created_at": "2024-01-01T10:00:00Z",
 *       "updated_at": "2024-01-01T10:05:00Z"
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 10,
 *     "total": 25
 *   }
 * }
 *
 * @throws {400} When query parameters are invalid
 * @throws {500} When database or internal server error occurs
 */
export async function GET(request: NextRequest) {
  if (!isFeatureEnabled("aiGeneration")) {
    return NextResponse.json(
      { error: "AI generation feature is currently disabled" },
      { status: 503 },
    );
  }

  try {
    // Parse query parameters from URL
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const parsed = listGenerationsSchema.safeParse(queryParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 },
      );
    }

    const { page, limit } = parsed.data;

    // Create Supabase client
    const supabase = await createClient();

    // Authenticate user
    const authResult = await getAuthenticatedUserId();
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error.message },
        { status: authResult.error.status },
      );
    }

    // Call service function to get generations list
    const result = await listGenerations(
      authResult.userId,
      page,
      limit,
      supabase,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Error fetching generations:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
