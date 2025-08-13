import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Define public routes that don't require authentication
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

// Define API routes that should be publicly accessible
const PUBLIC_API_PATHS = ["/api/auth"];

export async function middleware(request: NextRequest) {
  try {
    // console.log("🔍 Middleware executing for:", request.nextUrl.pathname);

    let supabaseResponse = NextResponse.next({
      request,
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // IMPORTANT: Do not run code between createServerClient and supabase.auth.getUser()
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // console.log(
    //     "👤 User status:",
    //     user ? "Authenticated" : "Not authenticated",
    // );

    const { pathname } = request.nextUrl;

    // Check if the current path is public
    const isPublicPath = PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
    const isPublicApiPath = PUBLIC_API_PATHS.some((path) =>
      pathname.startsWith(path),
    );

    // console.log("🔒 Path check:", {
    //     pathname,
    //     isPublicPath,
    //     isPublicApiPath,
    // });

    // If user is not authenticated and trying to access a protected route
    if (!user && !isPublicPath && !isPublicApiPath) {
      // console.log(
      //     "🚫 Redirecting to login - user not authenticated for protected route",
      // );
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }

    // If user is authenticated and trying to access auth pages, redirect to generate
    if (user && (pathname === "/login" || pathname === "/register")) {
      // console.log(
      //     "✅ Redirecting to generate - authenticated user on auth page",
      // );
      const url = request.nextUrl.clone();
      url.pathname = "/generate";
      return NextResponse.redirect(url);
    }

    // console.log("✨ Allowing access to:", pathname);

    // Add pathname to headers so ConditionalHeader can access it
    supabaseResponse.headers.set("x-pathname", pathname);

    return supabaseResponse;
  } catch (error) {
    console.error("❌ Middleware error:", error);
    // In case of error, just pass through the request
    return NextResponse.next({
      request,
    });
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
