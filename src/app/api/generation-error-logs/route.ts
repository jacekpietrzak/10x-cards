import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient, DEFAULT_USER_ID } from "@/utils/supabase/server";
import {
  getErrorLogs,
  getErrorLogsCount,
} from "@/lib/services/generationErrorLog.service";
import { GenerationErrorLogsQueryParamsSchema } from "@/lib/schemas/generationErrorLog";

// Simple in-memory rate limiting (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute

/**
 * Basic rate limiting check
 */
function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const clientLimit = rateLimitMap.get(clientIp);

  if (!clientLimit || now > clientLimit.resetTime) {
    // Reset or initialize
    rateLimitMap.set(clientIp, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (clientLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  clientLimit.count++;
  return true;
}

/**
 * GET /api/generation-error-logs
 *
 * Retrieves generation error logs with pagination. This endpoint is restricted to administrators only.
 *
 * Supported query parameters:
 * - userId (string, optional): UUID of a specific user to filter logs for
 * - page (number, optional): Page number for pagination (default: 1)
 * - limit (number, optional): Number of records per page (default: 100, max: 1000)
 *
 * Authorization:
 * - Development: Default user (DEFAULT_USER_ID) is automatically granted admin access
 * - Production: Requires valid Bearer token and user must have admin role in user_metadata
 *
 * Rate Limiting:
 * - 60 requests per minute per IP address
 */
export async function GET(request: NextRequest) {
  try {
    // Basic rate limiting
    const clientIp =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!checkRateLimit(clientIp)) {
      console.warn(`Rate limit exceeded for IP: ${clientIp}`);
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    // Extract and validate query parameters
    const { searchParams } = new URL(request.url);
    const rawParams = Object.fromEntries(searchParams.entries());
    const parsed = GenerationErrorLogsQueryParamsSchema.safeParse(rawParams);

    if (!parsed.success) {
      console.warn("Invalid query parameters:", parsed.error.errors);
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 },
      );
    }

    const { userId: filterUserId, page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    // Create Supabase server client
    const supabase = await createClient();

    // Development vs Production authorization
    if (process.env.NODE_ENV === "development") {
      // Development mode: grant admin access to default user
      console.info("Development mode: Admin access granted to default user:", {
        defaultUserId: DEFAULT_USER_ID,
        filterUserId: filterUserId || "all_users",
        page,
        limit,
        clientIp,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Production mode: check user authentication and admin role
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.warn("Unauthorized access attempt:", {
          authError: authError?.message,
          clientIp,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Check if user has admin role in metadata
      if (user.user_metadata?.role !== "admin") {
        console.warn("Non-admin user attempted to access error logs:", {
          userId: user.id,
          userRole: user.user_metadata?.role,
          clientIp,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json(
          { error: "Forbidden: Admin access required" },
          { status: 403 },
        );
      }

      // Log successful admin authentication in production
      console.info("Admin authenticated for error logs access:", {
        adminUserId: user.id,
        adminEmail: user.email,
        filterUserId: filterUserId || "all_users",
        page,
        limit,
        clientIp,
        timestamp: new Date().toISOString(),
      });
    }

    // Fetch error logs and total count in parallel for better performance
    const [errorLogs, totalCount] = await Promise.all([
      getErrorLogs(filterUserId, supabase, limit, offset),
      getErrorLogsCount(filterUserId, supabase),
    ]);

    // Prepare paginated response
    const response = {
      data: errorLogs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPreviousPage: page > 1,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/generation-error-logs:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
