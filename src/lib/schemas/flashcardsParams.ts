import { z } from "zod";

/**
 * Zod schema for validating the dynamic route parameter of the
 * GET /flashcards/{id} endpoint.
 *
 * The `id` must be a positive integer represented as a string in the URL.
 * After validation it is coerced to a number so that downstream code can
 * operate on a numeric identifier.
 */
export const flashcardIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/, "Invalid flashcard id")
    .transform(Number),
});

export type FlashcardIdParam = z.infer<typeof flashcardIdParamSchema>;
