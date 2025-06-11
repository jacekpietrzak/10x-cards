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
