import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware resolves the current site from the request hostname
 * and stores the result in request headers for server components.
 */
export async function middleware(request: NextRequest) {
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
  const hostname = host.split(":")[0]; // strip port

  // Local dev: allow ?site=<slug> to select a site
  const siteSlug = request.nextUrl.searchParams.get("site");

  // Pass resolution hints to server components via REQUEST headers
  const requestHeaders = new Headers(request.headers);
  if (siteSlug) {
    requestHeaders.set("x-site-slug", siteSlug);
  }
  requestHeaders.set("x-request-host", hostname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
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
