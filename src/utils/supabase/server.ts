import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/db/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Cookie setting in Server Component, can be ignored with middleware
          }
        },
      },
    },
  );
}
export const DEFAULT_USER_ID = "e6f961f9-34f2-4bc8-a12d-13256f80749a";

/**
 * Helper function to get authenticated user ID.
 * In development mode (NODE_ENV=development), uses DEFAULT_USER_ID.
 * In production mode, authenticates with Supabase session.
 *
 * @param supabase - Supabase client instance
 * @returns Object with userId or error response data
 */
export async function getAuthenticatedUserId(
  supabase: SupabaseClient<Database>,
): Promise<
  | { userId: string; error: null }
  | { userId: null; error: { message: string; status: number } }
> {
  // Development mode: use default user ID
  if (process.env.NODE_ENV === "development") {
    return { userId: DEFAULT_USER_ID, error: null };
  }

  // Production mode: authenticate with session
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        userId: null,
        error: { message: "Unauthorized", status: 401 },
      };
    }

    return { userId: user.id, error: null };
  } catch {
    return {
      userId: null,
      error: { message: "Authentication failed", status: 401 },
    };
  }
}
