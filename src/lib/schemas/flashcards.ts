import { z } from "zod";

/**
 * Zod schema for validating query parameters of the GET /flashcards endpoint.
 */
export const flashcardsQueryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sort: z
    .enum([
      "created_at",
      "front",
      "back",
      "source",
      "updated_at",
      "due",
    ] as const)
    .default("created_at"),
  order: z.enum(["asc", "desc"] as const).default("asc"),
  source: z.enum(["ai-full", "ai-edited", "manual"] as const).optional(),
  generation_id: z.coerce.number().int().min(1).optional(),
  due_before: z.string().datetime().optional(),
});

export type FlashcardsQueryParams = z.infer<typeof flashcardsQueryParamsSchema>;

// Schema for validating the body of the PUT /flashcards/{id} endpoint
export const flashcardUpdateSchema = z
  .object({
    front: z
      .string()
      .max(200, "Front text cannot exceed 200 characters")
      .optional(),
    back: z
      .string()
      .max(500, "Back text cannot exceed 500 characters")
      .optional(),
    source: z.enum(["ai-full", "ai-edited", "manual"] as const).optional(),
    generation_id: z.number().int().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one property must be provided for update",
  })
  .refine(
    (data) => {
      if (data.source === "manual") {
        return data.generation_id === null || data.generation_id === undefined;
      }
      if (data.source === "ai-full" || data.source === "ai-edited") {
        // For AI sources generation_id must be provided (non-null)
        return data.generation_id !== null && data.generation_id !== undefined;
      }
      // If source is not provided we cannot validate this rule – allow
      return true;
    },
    {
      message:
        "generation_id must be null for manual source and required for AI sources",
      path: ["generation_id"],
    },
  );

export type FlashcardUpdateInput = z.infer<typeof flashcardUpdateSchema>;

/**
 * Zod schema for validating the body of the PUT /flashcards/{id}/review endpoint.
 * Used to update FSRS (Free Spaced Repetition Scheduler) parameters after a review session.
 */
export const flashcardReviewSchema = z.object({
  stability: z
    .number()
    .min(0.01, "Stability must be at least 0.01")
    .max(999999, "Stability cannot exceed 999999")
    .finite("Stability must be a finite number"),
  difficulty: z
    .number()
    .min(1, "Difficulty must be at least 1")
    .max(10, "Difficulty cannot exceed 10")
    .finite("Difficulty must be a finite number"),
  due: z
    .string()
    .datetime("Due date must be a valid ISO 8601 datetime string")
    .refine((date) => new Date(date) > new Date(), {
      message: "Due date must be in the future",
    }),
  lapses: z
    .number()
    .int("Lapses must be an integer")
    .min(0, "Lapses cannot be negative")
    .max(999999, "Lapses cannot exceed 999999"),
  state: z
    .number()
    .int("State must be an integer")
    .min(0, "State must be between 0 and 3")
    .max(3, "State must be between 0 and 3"),
  last_review: z
    .string()
    .datetime("Last review date must be a valid ISO 8601 datetime string")
    .refine((date) => new Date(date) <= new Date(), {
      message: "Last review date cannot be in the future",
    }),
});

export type FlashcardReviewInput = z.infer<typeof flashcardReviewSchema>;
