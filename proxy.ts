import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "maiti_admin_session";
const CSRF_METHODS = ["POST", "PUT", "PATCH", "DELETE"];
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 100;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getAuthSecret(): Uint8Array {
  if (!process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET environment variable is required.");
  }
  return new TextEncoder().encode(process.env.AUTH_SECRET);
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count++;
  return true;
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/") || pathname.startsWith("/webhooks/");
}

function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

function buildCspHeader(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com https://res.cloudinary.com https://*.cloudinary.com https://*.stripe.com",
    "font-src 'self'",
    "connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://analytics.google.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  return directives.join("; ");
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("Content-Security-Policy", buildCspHeader());
  return response;
}

async function verifySession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getAuthSecret());
    return true;
  } catch {
    return false;
  }
}

function handleCsrfProtection(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host !== host) {
        return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
  }

  return null;
}

/**
 * Proxy resolves the current site from the request hostname and stores the
 * result in request headers for server components. Also handles security
 * headers, CSRF protection, rate limiting, and admin auth.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Rate limit API routes
  const ip = getClientIp(request);
  if (isApiRoute(pathname)) {
    const rateKey = `api:${ip}:${pathname}`;
    if (!checkRateLimit(rateKey)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  // CSRF protection for state-changing API requests
  if (CSRF_METHODS.includes(request.method) && isApiRoute(pathname)) {
    const csrfError = handleCsrfProtection(request);
    if (csrfError) return addSecurityHeaders(csrfError);
  }

  // Admin auth guard
  if (isAdminRoute(pathname)) {
    const isPublicAdmin =
      pathname === "/admin/login" ||
      pathname.startsWith("/admin/login") ||
      pathname.startsWith("/admin/forgot-password") ||
      pathname.startsWith("/admin/reset-password");

    if (!isPublicAdmin) {
      const authenticated = await verifySession(request);
      if (!authenticated) {
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return addSecurityHeaders(NextResponse.redirect(loginUrl));
      }
    }
  }

  // Site resolution from hostname
  const host = request.headers.get("host") ?? "";
  const hostname = host.split(":")[0];

  const siteSlug = request.nextUrl.searchParams.get("site");

  const requestHeaders = new Headers(request.headers);
  if (siteSlug) {
    requestHeaders.set("x-site-slug", siteSlug);
  }
  requestHeaders.set("x-request-host", hostname);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (siteSlug) {
    response.cookies.set("site_preview", siteSlug, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60,
    });
  }

  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|public/).*)",
  ],
};
