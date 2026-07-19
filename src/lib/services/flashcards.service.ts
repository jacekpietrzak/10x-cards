import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type {
  FlashcardDto,
  FlashcardInsert,
  FlashcardReviewDto,
  FlashcardsCreateCommand,
  FlashcardUpdateDto,
} from "@/lib/types";
import type { FlashcardsQueryParams } from "@/lib/schemas/flashcards";
import type { ImportPatch, ImportRequest } from "@/lib/schemas/import";

export async function createFlashcards(
  command: FlashcardsCreateCommand,
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<{ flashcards: FlashcardDto[] }> {
  try {
    // Map command to database insert format with FSRS defaults for new cards
    const now = new Date();
    const toInsert = command.flashcards.map((f) => ({
      ...f,
      user_id: userId,
      // Set FSRS defaults for new cards to make them immediately available for learning
      stability: null, // Will be set by FSRS algorithm on first review
      difficulty: null, // Will be set by FSRS algorithm on first review
      due: now.toISOString(), // Available for learning immediately
      lapses: 0, // Start with no lapses
      state: 0, // State.New
      last_review: null, // No previous review
    }));

    // Insert flashcards and return created records
    const { data, error } = await supabase
      .from("flashcards")
      .insert(toInsert)
      .select(
        "id, front, back, source, generation_id, created_at, updated_at, stability, difficulty, due, lapses, state, last_review",
      );

    if (error || !data) {
      console.error("Error inserting flashcards:", error);
      throw new Error(error?.message || "Insert failed");
    }

    return { flashcards: data };
  } catch (err) {
    console.error("Error in createFlashcards:", err);
    throw err;
  }
}

/**
 * Retrieves a paginated list of flashcards for a specific user.
 *
 * @param userId - The ID of the user whose flashcards should be fetched.
 * @param params - Validated and parsed query parameters controlling pagination, sorting and filtering.
 * @param supabase - An instance of Supabase client.
 *
 * @returns An object containing flashcard DTOs and pagination metadata.
 * @throws When the Supabase query returns an error.
 */
export async function listFlashcards(
  userId: string,
  params: FlashcardsQueryParams,
  supabase: SupabaseClient<Database>,
): Promise<{
  data: FlashcardDto[];
  pagination: { page: number; limit: number; total: number };
}> {
  const { page, limit, sort, order, source, generation_id, due_before } =
    params;

  const offset = (page - 1) * limit;

  // Build base query scoped to the current user
  let query = supabase
    .from("flashcards")
    .select(
      "id, front, back, source, generation_id, created_at, updated_at, stability, difficulty, due, lapses, state, last_review",
      {
        count: "exact",
      },
    )
    .eq("user_id", userId);

  // Optional filters
  if (source) {
    query = query.eq("source", source);
  }

  if (generation_id) {
    query = query.eq("generation_id", generation_id);
  }

  if (due_before) {
    // Filter cards due before the specified date
    // Include both cards with due dates and new cards (state = 0) that might have null due
    query = query.or(`due.lte.${due_before},and(due.is.null,state.eq.0)`);
  }

  // Sorting
  query = query.order(sort, { ascending: order === "asc" });

  // Pagination (Supabase uses 0-based index for range)
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  // PostgREST returns status 416 (Requested Range Not Satisfiable) when the offset
  // exceeds the number of available rows. Supabase JS may expose this scenario with
  // different `code` values depending on version (e.g., "416" or "PGRST116"). We
  // therefore allow any error that clearly relates to an unsatisfiable range.
  const isRangeError =
    error &&
    (error.code === "416" ||
      error.code === "PGRST116" ||
      error.details?.toLowerCase().includes("range") === true ||
      error.message?.toLowerCase().includes("range") === true);

  if (error && !isRangeError) {
    console.error("Error fetching flashcards:", error);
    throw new Error(error?.message || "Failed to fetch flashcards");
  }

  return {
    data: data ?? [],
    pagination: {
      page,
      limit,
      total: count ?? 0,
    },
  };
}

/**
 * Fetches a single flashcard belonging to the specified user.
 *
 * @param id - The identifier of the flashcard to retrieve.
 * @param userId - The identifier of the currently authenticated user.
 * @param supabase - Supabase client instance.
 *
 * @returns A `FlashcardDto` if found, otherwise `null` when the flashcard does
 *          not exist or does not belong to the user.
 * @throws  Rethrows any unexpected Supabase errors.
 */
export async function getFlashcardById(
  id: number,
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<FlashcardDto | null> {
  const { data, error } = await supabase
    .from("flashcards")
    .select(
      "id, front, back, source, generation_id, created_at, updated_at, stability, difficulty, due, lapses, state, last_review",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  // When the record is not found PostgREST returns error code PGRST116 or 404/"".
  // We treat this as a non-exceptional case and return `null` so that the route
  // handler can translate it into a 404 response.
  const isNotFoundError =
    error && (error.code === "PGRST116" || error.code === "404");

  if (error && !isNotFoundError) {
    // Log the unexpected error for observability purposes.
    console.error("Error fetching flashcard:", error);
    throw error;
  }

  if (!data || isNotFoundError) {
    return null;
  }

  return data;
}

/**
 * Updates a flashcard belonging to the specified user.
 *
 * @param id - The identifier of the flashcard to update.
 * @param dto - The updated flashcard data.
 * @param userId - The identifier of the currently authenticated user.
 * @param supabase - Supabase client instance.
 *
 * @returns The updated `FlashcardDto` if successful, otherwise `null` when the flashcard
 *          does not exist or does not belong to the user.
 * @throws  Rethrows any unexpected Supabase errors.
 */
export async function updateFlashcard(
  id: number,
  dto: FlashcardUpdateDto,
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<FlashcardDto | null> {
  try {
    // Remove undefined values to avoid overwriting with null
    const payload = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    ) as FlashcardUpdateDto;

    const { data, error } = await supabase
      .from("flashcards")
      .update(payload)
      .eq("id", id)
      .eq("user_id", userId)
      .select(
        "id, front, back, source, generation_id, created_at, updated_at, stability, difficulty, due, lapses, state, last_review",
      )
      .single();

    const isNotFoundError =
      error && (error.code === "PGRST116" || error.code === "404");
    const isForeignKeyError =
      error &&
      error.code === "23503" &&
      error.details?.includes("generation_id");

    if (error && !isNotFoundError) {
      console.error("Error updating flashcard:", error);

      if (isForeignKeyError) {
        throw new Error(
          "Invalid generation_id: The specified generation does not exist",
        );
      }

      throw error;
    }

    if (!data || isNotFoundError) {
      return null; // Flashcard does not exist or does not belong to user
    }

    return data;
  } catch (err) {
    console.error("Unexpected error in updateFlashcard:", err);
    throw err;
  }
}

/**
 * Deletes a flashcard belonging to the specified user.
 *
 * @param id - The identifier of the flashcard to delete.
 * @param userId - The identifier of the currently authenticated user.
 * @param supabase - Supabase client instance.
 *
 * @returns `true` if the flashcard was successfully deleted, otherwise `false` when the
 *          flashcard does not exist or does not belong to the user.
 * @throws  Rethrows any unexpected Supabase errors.
 */
export async function deleteFlashcard(
  id: number,
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  try {
    // First verify that the flashcard exists and belongs to the user
    const { data: existingFlashcard, error: selectError } = await supabase
      .from("flashcards")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    const isNotFoundError =
      selectError &&
      (selectError.code === "PGRST116" || selectError.code === "404");

    if (selectError && !isNotFoundError) {
      console.error("Error verifying flashcard ownership:", selectError);
      throw selectError;
    }

    if (!existingFlashcard || isNotFoundError) {
      return false; // Flashcard does not exist or does not belong to user
    }

    // Delete the flashcard
    const { error: deleteError } = await supabase
      .from("flashcards")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting flashcard:", deleteError);
      throw deleteError;
    }

    return true;
  } catch (err) {
    console.error("Unexpected error in deleteFlashcard:", err);
    throw err;
  }
}

/**
 * Updates FSRS parameters for a flashcard after a review session.
 *
 * @param id - The identifier of the flashcard to update.
 * @param userId - The identifier of the currently authenticated user.
 * @param reviewData - The FSRS parameters to update (stability, difficulty, due, lapses, state, last_review).
 * @param supabase - Supabase client instance.
 *
 * @returns The updated `FlashcardDto` if successful, otherwise `null` when the flashcard
 *          does not exist or does not belong to the user.
 * @throws  Rethrows any unexpected Supabase errors.
 */
export async function updateFlashcardReview(
  id: number,
  userId: string,
  reviewData: FlashcardReviewDto,
  supabase: SupabaseClient<Database>,
): Promise<FlashcardDto | null> {
  try {
    // Convert ISO date strings to Date objects for database insertion
    const payload = {
      stability: reviewData.stability,
      difficulty: reviewData.difficulty,
      due: reviewData.due,
      lapses: reviewData.lapses,
      state: reviewData.state,
      last_review: reviewData.last_review,
    };

    const { data, error } = await supabase
      .from("flashcards")
      .update(payload)
      .eq("id", id)
      .eq("user_id", userId)
      .select(
        "id, front, back, source, generation_id, created_at, updated_at, stability, difficulty, due, lapses, state, last_review",
      )
      .single();

    const isNotFoundError =
      error && (error.code === "PGRST116" || error.code === "404");

    if (error && !isNotFoundError) {
      console.error("Error updating flashcard review data:", error);
      throw error;
    }

    if (!data || isNotFoundError) {
      return null; // Flashcard does not exist or does not belong to user
    }

    return data;
  } catch (err) {
    console.error("Unexpected error in updateFlashcardReview:", err);
    throw err;
  }
}

/**
 * Idempotently imports a batch of flashcards for a single user via the
 * machine-auth endpoint (POST /api/import).
 *
 * Upserts on the natural key `(user_id, front)`: an existing front has only its
 * `back` updated (the `set_updated_at` trigger refreshes `updated_at`); a new
 * front is inserted with `source = "manual"` and the FSRS defaults that make it
 * immediately reviewable. There is no `UNIQUE(user_id, front)` constraint, so the
 * upsert is done manually (lookup → partition → insert/update) to yield exact
 * `{ inserted, updated }` counts without a migration.
 *
 * This runs against a service-role client that bypasses RLS, so **every** query
 * is hard-scoped to `userId` in application code — that scoping is the only
 * tenant boundary. The existence check uses per-card `.eq("front", …)` rather
 * than a batched `.in("front", …)`: `supabase-js`'s `.in()` does not escape an
 * embedded `"`, which would silently miss a row and break idempotency, whereas
 * `.eq()` percent-encodes the operand and is safe for arbitrary text.
 *
 * @param cards - Validated `{ front, back }` pairs (already trimmed by the schema).
 * @param userId - The single import user; the tenant scope for every operation.
 * @param supabase - A service-role Supabase client.
 *
 * @returns Exact counts of rows inserted vs. updated.
 * @throws Rethrows any unexpected Supabase error (the route translates it to 500).
 */
export async function importFlashcards(
  cards: { front: string; back: string }[],
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<{ inserted: number; updated: number }> {
  // 1. Dedup intra-batch by front, last-occurrence-wins. Without this, duplicate
  //    fronts in one batch would each insert a row (no DB constraint stops them).
  const deduped = new Map<string, string>();
  for (const card of cards) {
    deduped.set(card.front, card.back);
  }

  const collapsed = cards.length - deduped.size;
  if (collapsed > 0) {
    console.warn(
      `importFlashcards: collapsed ${collapsed} intra-batch duplicate front(s) (last occurrence wins)`,
    );
  }

  // 2. Look up each front individually, scoped to userId. Parallelized so wall
  //    time is ~one round-trip regardless of batch size (Vercel-timeout safe).
  //    .eq("front", …) is quote-safe; never use .in("front", …) here.
  const entries = Array.from(deduped.entries());
  const lookups = await Promise.all(
    entries.map(async ([front, back]) => {
      const { data, error } = await supabase
        .from("flashcards")
        .select("id")
        .eq("user_id", userId)
        .eq("front", front)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(
          "Error looking up existing flashcard during import:",
          error,
        );
        throw error;
      }

      return { front, back, existingId: data?.id ?? null };
    }),
  );

  // 3. Partition: existing front → update only `back`; new front → insert with
  //    FSRS defaults mirroring createFlashcards (immediately reviewable).
  const now = new Date().toISOString();
  const toInsert: FlashcardInsert[] = [];
  const toUpdate: { id: number; back: string }[] = [];

  for (const { front, back, existingId } of lookups) {
    if (existingId !== null) {
      toUpdate.push({ id: existingId, back });
      continue;
    }

    toInsert.push({
      user_id: userId,
      front,
      back,
      source: "manual",
      generation_id: null,
      stability: null,
      difficulty: null,
      due: now,
      lapses: 0,
      state: 0,
      last_review: null,
    });
  }

  // 4. One batch insert for all new cards.
  if (toInsert.length > 0) {
    const { error } = await supabase.from("flashcards").insert(toInsert);

    if (error) {
      console.error("Error inserting flashcards during import:", error);
      throw error;
    }
  }

  // 5. Update existing cards' `back` only; updated_at refreshes via DB trigger.
  //    Parallelized, same rationale as the lookups.
  await Promise.all(
    toUpdate.map(async ({ id, back }) => {
      const { error } = await supabase
        .from("flashcards")
        .update({ back })
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        // Log the row id (a non-sensitive DB integer) for traceability without
        // logging card content; aids debugging a partial-write 500 on retry.
        console.error(
          `Error updating flashcard during import (id=${id}):`,
          error,
        );
        throw error;
      }
    }),
  );

  // 6. Exact counts.
  return { inserted: toInsert.length, updated: toUpdate.length };
}

/** Why a patch was skipped rather than applied (see patchManualFlashcards). */
export interface ImportSkippedPatch {
  old_front: string;
  reason: "old_front_not_found" | "new_front_conflict";
}

/**
 * Deletes manual flashcards by front for the import user (POST /api/import).
 *
 * Hard safety invariant: every delete carries both `.eq("user_id", …)` and
 * `.eq("source", "manual")` — AI-generated cards (`ai-full`, `ai-edited`) are
 * unreachable even if their front matches, and the service-role client's RLS
 * bypass is contained to the single import user. Deletes run per-front with
 * `.eq("front", …)` (never `.in()`, which does not escape embedded quotes),
 * parallelized like the import lookups.
 *
 * With no `UNIQUE(user_id, front)` constraint, a front may match several manual
 * rows; delete removes **all** of them (unlike patch, which updates one). The
 * exact `deleted` count comes from the returned rows. Deleting an absent front
 * is a no-op, so re-sending the same diff after a partial failure converges.
 *
 * @param fronts - Trimmed fronts to delete (deduped here; schema pre-trims).
 * @param userId - The single import user; the tenant scope for every operation.
 * @param supabase - A service-role Supabase client.
 *
 * @returns Exact count of rows deleted across all fronts.
 * @throws Rethrows any Supabase error (the route translates it to 500).
 */
export async function deleteManualFlashcards(
  fronts: string[],
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<{ deleted: number }> {
  const unique = Array.from(new Set(fronts));

  const collapsed = fronts.length - unique.length;
  if (collapsed > 0) {
    console.warn(
      `deleteManualFlashcards: collapsed ${collapsed} intra-batch duplicate front(s)`,
    );
  }

  const counts = await Promise.all(
    unique.map(async (front) => {
      const { data, error } = await supabase
        .from("flashcards")
        .delete()
        .eq("user_id", userId)
        .eq("source", "manual")
        .eq("front", front)
        .select("id");

      if (error) {
        console.error("Error deleting flashcard during import:", error);
        throw error;
      }

      return data?.length ?? 0;
    }),
  );

  return { deleted: counts.reduce((sum, count) => sum + count, 0) };
}

/**
 * Renames/edits manual flashcards in place for the import user (POST /api/import).
 *
 * Each patch looks up its `old_front`, checks the target `new_front` for a
 * conflict, then updates `front`/`back` on the found row — preserving the row
 * id and all FSRS state. `updated_at` refreshes via the DB trigger; never set
 * it manually. The same safety invariant as deleteManualFlashcards applies:
 * lookup and update are scoped `.eq("user_id", …).eq("source", "manual")`, so
 * AI-generated cards are unreachable.
 *
 * Skips are reported, not thrown, so one stale diff entry never blocks the
 * rest of the request and retries converge:
 * - no manual row matches `old_front` → `reason: "old_front_not_found"`;
 * - another row (any source) already has `new_front` → `reason:
 *   "new_front_conflict"` — `(user_id, front)` is the import pipeline's dedup
 *   key regardless of source, and merging would destroy FSRS state. A back-only
 *   patch (`old_front === new_front`) skips the conflict check entirely, so it
 *   never self-collides.
 *
 * Patches run **sequentially**: patches can chain (A→B while B→C) and two
 * patches can target the same `new_front`, so parallel execution would race
 * the conflict checks. Lookups use `.limit(1).maybeSingle()` — with no unique
 * constraint on `(user_id, front)`, bare `.maybeSingle()` throws on duplicate
 * fronts. A duplicate-front patch therefore updates only the single row the
 * lookup found (unlike delete, which removes all matches) — accepted asymmetry
 * for the single-writer manual namespace.
 *
 * @param patches - Validated patches (deduped here by `old_front`, last wins).
 * @param userId - The single import user; the tenant scope for every operation.
 * @param supabase - A service-role Supabase client.
 *
 * @returns Count of applied patches plus per-patch skip reasons.
 * @throws Rethrows any Supabase error (the route translates it to 500).
 */
export async function patchManualFlashcards(
  patches: ImportPatch[],
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<{ patched: number; skipped_patches: ImportSkippedPatch[] }> {
  // Dedup intra-batch by old_front, last-occurrence-wins, mirroring importFlashcards.
  const deduped = new Map<string, ImportPatch>();
  for (const patch of patches) {
    deduped.set(patch.old_front, patch);
  }

  const collapsed = patches.length - deduped.size;
  if (collapsed > 0) {
    console.warn(
      `patchManualFlashcards: collapsed ${collapsed} intra-batch duplicate old_front(s) (last occurrence wins)`,
    );
  }

  let patched = 0;
  const skipped_patches: ImportSkippedPatch[] = [];

  for (const { old_front, new_front, new_back } of deduped.values()) {
    // 1. Find the manual row to patch.
    const { data: existing, error: lookupError } = await supabase
      .from("flashcards")
      .select("id")
      .eq("user_id", userId)
      .eq("source", "manual")
      .eq("front", old_front)
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      console.error("Error looking up flashcard during import patch:", lookupError);
      throw lookupError;
    }

    if (!existing) {
      skipped_patches.push({ old_front, reason: "old_front_not_found" });
      continue;
    }

    // 2. Conflict check (any source), skipped for back-only patches.
    if (old_front !== new_front) {
      const { data: conflict, error: conflictError } = await supabase
        .from("flashcards")
        .select("id")
        .eq("user_id", userId)
        .eq("front", new_front)
        .neq("id", existing.id)
        .limit(1)
        .maybeSingle();

      if (conflictError) {
        console.error(
          "Error checking rename conflict during import patch:",
          conflictError,
        );
        throw conflictError;
      }

      if (conflict) {
        skipped_patches.push({ old_front, reason: "new_front_conflict" });
        continue;
      }
    }

    // 3. Apply. Do not set updated_at (DB trigger handles it).
    const { error: updateError } = await supabase
      .from("flashcards")
      .update({ front: new_front, back: new_back })
      .eq("id", existing.id)
      .eq("user_id", userId)
      .eq("source", "manual");

    if (updateError) {
      // Log the row id (non-sensitive DB integer), not card content.
      console.error(
        `Error updating flashcard during import patch (id=${existing.id}):`,
        updateError,
      );
      throw updateError;
    }

    patched += 1;
  }

  return { patched, skipped_patches };
}

/**
 * Orchestrates a full POST /api/import request: deletes → patches → cards
 * upsert, in that deterministic order, best-effort (no transaction —
 * supabase-js/PostgREST has no multi-statement transactions). Every phase is
 * idempotent, so the caller's recovery from a mid-request 500 with partial
 * writes is to re-send the same diff.
 *
 * Missing phases contribute zero counts; all five response fields are always
 * present. `inserted` and `updated` stay first and adjacent in the return
 * literal — the pre-Step-5 smoke script greps for the exact substring
 * `"inserted":N,"updated":M` and NextResponse.json preserves literal key order.
 *
 * @param payload - The validated import request (any subset of the three arrays).
 * @param userId - The single import user; the tenant scope for every operation.
 * @param supabase - A service-role Supabase client.
 *
 * @returns The five-field import response.
 * @throws Rethrows any Supabase error from a phase (the route translates it to 500).
 */
export async function processImportRequest(
  payload: ImportRequest,
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<{
  inserted: number;
  updated: number;
  deleted: number;
  patched: number;
  skipped_patches: ImportSkippedPatch[];
}> {
  let deleted = 0;
  if (payload.delete_fronts?.length) {
    ({ deleted } = await deleteManualFlashcards(
      payload.delete_fronts,
      userId,
      supabase,
    ));
  }

  let patched = 0;
  let skipped_patches: ImportSkippedPatch[] = [];
  if (payload.patches?.length) {
    ({ patched, skipped_patches } = await patchManualFlashcards(
      payload.patches,
      userId,
      supabase,
    ));
  }

  let inserted = 0;
  let updated = 0;
  if (payload.cards?.length) {
    ({ inserted, updated } = await importFlashcards(
      payload.cards,
      userId,
      supabase,
    ));
  }

  return { inserted, updated, deleted, patched, skipped_patches };
}
