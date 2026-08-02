import "server-only";

import { eq, or } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import type { Site } from "@/lib/db/schema";

/**
 * Tenant resolution — determines which site the current request belongs to.
 *
 * Resolution order:
 * 1. Custom domain match (sites.domain = hostname)
 * 2. Slug match (sites.slug = path segment)
 * 3. Default site (first site, or "default" slug)
 *
 * In a real multi-tenant deployment, the middleware would set the site context.
 * For now, we use a simple slug-based or default-site approach.
 */

export const getCurrentSite = cache(async (slug?: string): Promise<Site | null> => {
  if (slug) {
    const [site] = await db
      .select()
      .from(sites)
      .where(eq(sites.slug, slug));
    if (site) return site;
  }

  // Fallback: return the default (first) site
  const [site] = await db
    .select()
    .from(sites)
    .orderBy(sites.id);
  return site ?? null;
});

export const getSiteByDomain = cache(async (domain: string): Promise<Site | null> => {
  const [site] = await db
    .select()
    .from(sites)
    .where(or(eq(sites.domain, domain), eq(sites.slug, domain)));
  return site ?? null;
});

export const getSiteById = cache(async (id: number): Promise<Site | null> => {
  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, id));
  return site ?? null;
});

export const getAllSites = cache(async (): Promise<Site[]> => {
  return db.select().from(sites).orderBy(sites.id);
});
