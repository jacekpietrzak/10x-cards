import { z } from "zod";

/**
 * Zod schema for a single flashcard in the machine-auth import payload
 * (POST /api/import).
 *
 * `front` is trimmed and required non-empty because it is the dedup key for the
 * manual upsert in `importFlashcards`. `back` is trimmed and length-capped to
 * match the app's flashcard limits. `.trim()` runs before the length checks, so
 * surrounding whitespace never counts against the limit and whitespace-only
 * fronts fail `.min(1)`.
 *
 * Default (non-strict) object behavior strips unknown keys — a smuggled
 * `user_id` is dropped here and never reaches the service.
 */
export const importCardSchema = z.object({
  front: z
    .string()
    .trim()
    .min(1, "Front text cannot be empty")
    .max(200, "Front text cannot exceed 200 characters"),
  back: z
    .string()
    .trim()
    .max(500, "Back text cannot exceed 500 characters"),
});

export type ImportCard = z.infer<typeof importCardSchema>;

/**
 * Zod schema for the POST /api/import request body. Batch size is 1–100 cards;
 * validation is all-or-nothing (a single invalid card rejects the whole batch).
 */
export const importRequestSchema = z.object({
  cards: z
    .array(importCardSchema)
    .min(1, "At least one card is required")
    .max(100, "Cannot import more than 100 cards at once"),
});

export type ImportRequest = z.infer<typeof importRequestSchema>;
