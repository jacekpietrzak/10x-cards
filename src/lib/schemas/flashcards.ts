import { z } from "zod";

/**
 * Zod schema for validating query parameters of the GET /flashcards endpoint.
 */
export const flashcardsQueryParamsSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sort: z
        .enum(
            [
                "created_at",
                "front",
                "back",
                "source",
                "updated_at",
            ] as const,
        )
        .default("created_at"),
    order: z.enum(["asc", "desc"] as const).default("asc"),
    source: z.enum(["ai-full", "ai-edited", "manual"] as const).optional(),
    generation_id: z.coerce.number().int().min(1).optional(),
});

export type FlashcardsQueryParams = z.infer<typeof flashcardsQueryParamsSchema>;

// Schema for validating the body of the PUT /flashcards/{id} endpoint
export const flashcardUpdateSchema = z.object({
    front: z.string().max(200, "Front text cannot exceed 200 characters")
        .optional(),
    back: z.string().max(500, "Back text cannot exceed 500 characters")
        .optional(),
    source: z.enum(["ai-full", "ai-edited", "manual"] as const).optional(),
    generation_id: z.number().int().nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: "At least one property must be provided for update",
}).refine((data) => {
    if (data.source === "manual") {
        return data.generation_id === null || data.generation_id === undefined;
    }
    if (data.source === "ai-full" || data.source === "ai-edited") {
        // For AI sources generation_id must be provided (non-null)
        return data.generation_id !== null && data.generation_id !== undefined;
    }
    // If source is not provided we cannot validate this rule – allow
    return true;
}, {
    message:
        "generation_id must be null for manual source and required for AI sources",
    path: ["generation_id"],
});

export type FlashcardUpdateInput = z.infer<typeof flashcardUpdateSchema>;
