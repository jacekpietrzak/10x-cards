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
 * Zod schema for a single rename/edit patch in the import payload.
 *
 * `old_front` is the lookup key (must match an existing `source='manual'` row);
 * `new_front`/`new_back` replace the row's content in place, preserving its id
 * and FSRS state. Field rules mirror `importCardSchema`: `.trim()` runs before
 * the length checks, so surrounding whitespace never counts against the limit
 * and whitespace-only fronts fail `.min(1)`. Non-strict object behavior strips
 * smuggled keys (e.g. `user_id`, `id`) before they reach the service.
 */
export const importPatchSchema = z.object({
  old_front: z
    .string()
    .trim()
    .min(1, "old_front cannot be empty")
    .max(200, "old_front cannot exceed 200 characters"),
  new_front: z
    .string()
    .trim()
    .min(1, "new_front cannot be empty")
    .max(200, "new_front cannot exceed 200 characters"),
  new_back: z
    .string()
    .trim()
    .max(500, "new_back cannot exceed 500 characters"),
});

export type ImportPatch = z.infer<typeof importPatchSchema>;

/**
 * Zod schema for the POST /api/import request body.
 *
 * All three operation arrays are optional, each capped at 100 entries (chain
 * order matters: `.max()` must precede `.optional()` — ZodOptional has no
 * `.max()`). Validation is all-or-nothing per request. The `superRefine`
 * enforces request-level invariants Zod field rules can't express:
 *
 * - at least one array must be non-empty (an empty diff is a caller bug);
 * - `delete_fronts` must be disjoint from `cards[].front` and from
 *   `patches[].old_front` — a front both deleted and upserted/patched in one
 *   request would make the outcome depend silently on processing order.
 *
 * Fronts are compared post-trim: Zod runs field transforms before refinements,
 * so the refine sees trimmed values.
 */
export const importRequestSchema = z
  .object({
    cards: z
      .array(importCardSchema)
      .max(100, "Cannot import more than 100 cards at once")
      .optional(),
    delete_fronts: z
      .array(
        z
          .string()
          .trim()
          .min(1, "delete_fronts entries cannot be empty")
          .max(200, "delete_fronts entries cannot exceed 200 characters")
      )
      .max(100, "Cannot delete more than 100 fronts at once")
      .optional(),
    patches: z
      .array(importPatchSchema)
      .max(100, "Cannot patch more than 100 cards at once")
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hasCards = (data.cards?.length ?? 0) > 0;
    const hasDeletes = (data.delete_fronts?.length ?? 0) > 0;
    const hasPatches = (data.patches?.length ?? 0) > 0;

    if (!hasCards && !hasDeletes && !hasPatches) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one of cards, delete_fronts, or patches must be non-empty",
      });
      return;
    }

    if (!hasDeletes) return;
    const deleteSet = new Set(data.delete_fronts);

    const cardOverlap = data.cards?.find((card) => deleteSet.has(card.front));
    if (cardOverlap) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["delete_fronts"],
        message: "delete_fronts must be disjoint from cards[].front",
      });
    }

    const patchOverlap = data.patches?.find((patch) => deleteSet.has(patch.old_front));
    if (patchOverlap) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["delete_fronts"],
        message: "delete_fronts must be disjoint from patches[].old_front",
      });
    }
  });

export type ImportRequest = z.infer<typeof importRequestSchema>;
