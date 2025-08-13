import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { GenerationErrorLogDto } from "@/lib/types";

// Default limit for error logs to prevent excessive data transfer
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

/**
 * Retrieves generation error logs with optional user filtering and pagination.
 * This service is intended for admin use only.
 *
 * @param filterUserId - Optional user ID to filter logs for a specific user.
 * @param supabase - An instance of Supabase client.
 * @param limit - Maximum number of records to return (default: 100, max: 1000).
 * @param offset - Number of records to skip for pagination (default: 0).
 *
 * @returns An array of GenerationErrorLogDto objects ordered by creation date (newest first).
 * @throws When the Supabase query returns an error.
 */
export async function getErrorLogs(
  filterUserId: string | undefined,
  supabase: SupabaseClient<Database>,
  limit: number = DEFAULT_LIMIT,
  offset: number = 0,
): Promise<GenerationErrorLogDto[]> {
  try {
    // Enforce maximum limit to prevent performance issues
    const safeLimit = Math.min(limit, MAX_LIMIT);

    // Log admin access for audit trail
    console.info(`Admin accessing error logs`, {
      filterUserId: filterUserId || "all_users",
      limit: safeLimit,
      offset,
      timestamp: new Date().toISOString(),
    });

    // Build optimized query to select only required fields
    let query = supabase
      .from("generation_error_logs")
      .select(
        `
                id,
                error_code,
                error_message,
                model,
                source_text_hash,
                source_text_length,
                created_at,
                user_id
            `,
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + safeLimit - 1);

    // Apply user filter if provided
    if (filterUserId) {
      query = query.eq("user_id", filterUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching generation error logs:", {
        error: error.message,
        code: error.code,
        filterUserId,
        limit: safeLimit,
        offset,
      });
      throw new Error(
        error?.message || "Failed to fetch generation error logs",
      );
    }

    // Log successful retrieval
    console.info(`Successfully retrieved ${data?.length || 0} error logs`, {
      filterUserId: filterUserId || "all_users",
      recordCount: data?.length || 0,
      limit: safeLimit,
      offset,
    });

    return data ?? [];
  } catch (err) {
    console.error("Error in getErrorLogs:", {
      error: err instanceof Error ? err.message : String(err),
      filterUserId,
      limit,
      offset,
    });
    throw err;
  }
}

/**
 * Gets the total count of error logs, optionally filtered by user.
 * Useful for pagination calculations.
 *
 * @param filterUserId - Optional user ID to filter count for a specific user.
 * @param supabase - An instance of Supabase client.
 * @returns Total count of error logs matching the filter.
 */
export async function getErrorLogsCount(
  filterUserId: string | undefined,
  supabase: SupabaseClient<Database>,
): Promise<number> {
  try {
    let query = supabase
      .from("generation_error_logs")
      .select("*", { count: "exact", head: true });

    if (filterUserId) {
      query = query.eq("user_id", filterUserId);
    }

    const { count, error } = await query;

    if (error) {
      console.error("Error counting generation error logs:", error);
      throw new Error(
        error?.message || "Failed to count generation error logs",
      );
    }

    return count ?? 0;
  } catch (err) {
    console.error("Error in getErrorLogsCount:", err);
    throw err;
  }
}
