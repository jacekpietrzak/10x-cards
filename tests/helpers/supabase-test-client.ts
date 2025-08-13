import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";

/**
 * Creates a Supabase client for test cleanup using public key
 * This respects RLS policies and only allows deletion of the authenticated user's data
 */
export function createTestClient(): SupabaseClient<Database> {
  // Use environment variables as per .env.example format
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublicKey =
    process.env.SUPABASE_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabasePublicKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_PUBLIC_KEY must be set in .env.test",
    );
  }

  return createClient<Database>(supabaseUrl, supabasePublicKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Cleans up test data for the E2E test user
 * Authenticates as the test user and uses RLS policies to delete only their data
 * @param userId - The E2E_USERNAME_ID of the test user
 */
export async function cleanupTestData(userId: string) {
  const client = createTestClient();

  // Get E2E test credentials
  const email = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    console.error("❌ E2E_USERNAME and E2E_PASSWORD must be set for cleanup");
    return {
      success: false,
      message: "Test credentials not configured",
    };
  }

  // Authenticate as the E2E test user
  const { data: authData, error: authError } =
    await client.auth.signInWithPassword({
      email,
      password,
    });

  if (authError || !authData.user) {
    console.error("❌ Failed to authenticate for cleanup:", authError?.message);
    return {
      success: false,
      message: "Authentication failed",
      errors: [authError?.message || "Unknown auth error"],
    };
  }

  console.log("✅ Authenticated as E2E test user for cleanup");

  const results = {
    flashcards: 0,
    generations: 0,
    errorLogs: 0,
    errors: [] as string[],
  };

  try {
    // Delete flashcards - RLS ensures only the authenticated user's data is deleted
    const { data: flashcards, error: flashcardsError } = await client
      .from("flashcards")
      .delete()
      .eq("user_id", userId)
      .select("id");

    if (flashcardsError) {
      console.warn("⚠️ Error deleting flashcards:", flashcardsError.message);
      results.errors.push(`Flashcards: ${flashcardsError.message}`);
    } else {
      results.flashcards = flashcards?.length || 0;
      if (results.flashcards > 0) {
        console.log(`   📝 Deleted ${results.flashcards} flashcards`);
      }
    }

    // Delete generations - RLS ensures only the authenticated user's data is deleted
    const { data: generations, error: generationsError } = await client
      .from("generations")
      .delete()
      .eq("user_id", userId)
      .select("id");

    if (generationsError) {
      console.warn("⚠️ Error deleting generations:", generationsError.message);
      results.errors.push(`Generations: ${generationsError.message}`);
    } else {
      results.generations = generations?.length || 0;
      if (results.generations > 0) {
        console.log(`   🤖 Deleted ${results.generations} generations`);
      }
    }

    // Delete generation error logs - RLS ensures only the authenticated user's data is deleted
    const { data: errorLogs, error: errorLogsError } = await client
      .from("generation_error_logs")
      .delete()
      .eq("user_id", userId)
      .select("id");

    if (errorLogsError) {
      console.warn("⚠️ Error deleting error logs:", errorLogsError.message);
      results.errors.push(`Error logs: ${errorLogsError.message}`);
    } else {
      results.errorLogs = errorLogs?.length || 0;
      if (results.errorLogs > 0) {
        console.log(`   ⚠️ Deleted ${results.errorLogs} error logs`);
      }
    }
  } finally {
    // Sign out after cleanup
    await client.auth.signOut();
  }

  return {
    success: results.errors.length === 0,
    ...results,
  };
}
