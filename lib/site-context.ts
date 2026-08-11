import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import type { Site } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

const SITE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Resolves the current site from request headers set by middleware.
 *
 * Resolution order:
 * 1. x-site-slug header (?site= query param in URL)
 * 2. Authorized preview cookie (persists admin tenant previews across links)
 * 3. x-request-host header (hostname lookup)
 * 4. Localhost fallback: first site in DB for development convenience
 *
 * Returns null only if no sites exist at all.
 */
export const getResolvedSite = cache(async (): Promise<Site | null> => {
  const hdrs = await headers();
  const cookieStore = await cookies();
  const host = hdrs.get("x-request-host") ?? hdrs.get("x-forwarded-host")?.split(",")[0]?.trim() ?? hdrs.get("host")?.split(":")[0] ?? "";
  const previewSlug = normalizeSiteSlug(hdrs.get("x-site-slug") ?? cookieStore.get("site_preview")?.value);
  const allowProductionPreview = process.env.NODE_ENV !== "production"
    ? true
    : await canCurrentAdminPreview(previewSlug);
  return getSiteForRequest(
    host,
    previewSlug,
    { allowProductionPreview }
  );
});

/** Resolves a site for a public request without trusting a client-provided ID. */
export async function getSiteForRequest(
  host: string,
  siteSlug?: string | null,
  options: { allowProductionPreview?: boolean } = {}
): Promise<Site | null> {
  // 1. Check for slug-based override (?site=<slug>)
  if (siteSlug && (process.env.NODE_ENV !== "production" || options.allowProductionPreview)) {
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

function normalizeSiteSlug(value: string | undefined | null) {
  const slug = value?.trim().toLowerCase();
  return slug && slug.length <= 100 && SITE_SLUG_PATTERN.test(slug) ? slug : null;
}

async function canCurrentAdminPreview(siteSlug: string | null) {
  if (!siteSlug) return false;
  const user = await getSessionUser();
  if (!user) return false;
  const [site] = await db.select({ id: sites.id }).from(sites).where(eq(sites.slug, siteSlug));
  return Boolean(site && (user.role === "super_admin" || user.siteId === site.id));
}

/** Get siteId from the resolved site, or null if no site found. */
export async function getResolvedSiteId(): Promise<number | null> {
  const site = await getResolvedSite();
  return site?.id ?? null;
}
