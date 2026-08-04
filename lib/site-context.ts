import "server-only";

import { headers } from "next/headers";
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
 * 2. x-request-host header (hostname lookup)
 * 3. Fallback: first site in DB (default tenant)
 *
 * Returns null only if no sites exist at all.
 */
export const getResolvedSite = cache(async (): Promise<Site | null> => {
  const hdrs = await headers();
  return getSiteForRequest(
    hdrs.get("x-request-host") ?? "",
    hdrs.get("x-site-slug")
  );
});

/** Resolves a site for a public request without trusting a client-provided ID. */
export async function getSiteForRequest(host: string, siteSlug?: string | null): Promise<Site | null> {

  // 1. Check for slug-based override (?site=<slug>)
  if (siteSlug) {
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

  // 3. Fallback: return the first site (default tenant)
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
