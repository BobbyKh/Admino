import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import type { Site } from "@/lib/db/schema";

/**
 * Resolves the current site from request headers set by middleware.
 *
 * Resolution order:
 * 1. x-site-slug header (?site= query param in URL)
 * 2. Preview cookie (persists localhost/Vercel tenant previews across links)
 * 3. x-request-host header (hostname lookup)
 * 4. Localhost fallback: first site in DB for development convenience
 *
 * Returns null only if no sites exist at all.
 */
export const getResolvedSite = cache(async (): Promise<Site | null> => {
  const hdrs = await headers();
  const cookieStore = await cookies();
  const host = hdrs.get("x-request-host") ?? hdrs.get("x-forwarded-host")?.split(",")[0]?.trim() ?? hdrs.get("host")?.split(":")[0] ?? "";
  const previewSlug = process.env.NODE_ENV === "development"
    ? hdrs.get("x-site-slug") ?? cookieStore.get("site_preview")?.value
    : null;
  return getSiteForRequest(
    host,
    previewSlug
  );
});

/** Resolves a site for a public request without trusting a client-provided ID. */
export async function getSiteForRequest(host: string, siteSlug?: string | null): Promise<Site | null> {
  // 1. Check for slug-based override (?site=<slug>)
  if (process.env.NODE_ENV !== "production" && siteSlug) {
    const [site] = await db
      .select()
      .from(sites)
      .where(eq(sites.slug, siteSlug));
    if (site) return site;
  }

  // 2. Check hostname-based resolution
  if (host) {
    const [site] = await db
      .select()
      .from(sites)
      .where(eq(sites.domain, host));
    if (site) return site;
  }

  const isLocalHost = process.env.NODE_ENV !== "production" && (host === "localhost" || host === "127.0.0.1" || host === "");
  if (!isLocalHost) return null;

  // 3. Local development fallback: return the first site.
  const [site] = await db
    .select()
    .from(sites)
    .orderBy(sites.id);
  return site ?? null;
}

/** Get siteId from the resolved site, or null if no site found. */
export async function getResolvedSiteId(): Promise<number | null> {
  const site = await getResolvedSite();
  return site?.id ?? null;
}
