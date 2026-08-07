import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy resolves the current site from the request hostname and stores the
 * result in request headers for server components.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip admin, API, static files, and internal Next.js paths
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const host = request.headers.get("host") ?? "";
  const hostname = host.split(":")[0];

  // Query-based site resolution lets the admin open published tenants that do
  // not have a dedicated domain yet. Custom domains still work without it.
  const siteSlug = request.nextUrl.searchParams.get("site");

  // Pass resolution hints to server components via REQUEST headers
  const requestHeaders = new Headers(request.headers);
  if (siteSlug) {
    requestHeaders.set("x-site-slug", siteSlug);
  }
  requestHeaders.set("x-request-host", hostname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  if (siteSlug) {
    response.cookies.set("site_preview", siteSlug, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60,
    });
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
