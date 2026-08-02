import "server-only";

import { cache } from "react";
import { asc, desc, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  galleryImages,
  homeSections,
  menuCategories,
  menuItems,
  navLinks,
  pages,
  pageBlocks,
  settings,
} from "@/lib/db/schema";
import {
  DEFAULT_SETTINGS,
  parseFeatures,
  parseServices,
  SECRET_SETTING_KEYS,
  type SettingKey,
  type SiteSettings,
} from "@/lib/settings";
import { getResolvedSiteId } from "@/lib/site-context";

async function getSettingsRows(siteId?: number | null) {
  if (siteId) {
    const rows = await db.select().from(settings).where(eq(settings.siteId, siteId));
    return new Map(rows.map((r) => [r.key, r.value]));
  }
  const rows = await db.select().from(settings);
  return new Map(rows.map((r) => [r.key, r.value]));
}

/** Returns ALL settings including secrets — server-side API routes only. Never expose to client. */
export async function getAllServerSettings(siteId?: number | null) {
  const map = await getSettingsRows(siteId);
  const all: Record<string, string> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
    all[key] = map.get(key) ?? DEFAULT_SETTINGS[key];
  }
  return all;
}

/** Merges public DB settings over defaults (secrets excluded) and parses JSON fields. */
export async function getSiteSettings(siteId?: number | null): Promise<SiteSettings> {
  const map = await getSettingsRows(siteId);
  // Build from scratch so credential keys never enter the public object.
  const merged: Record<string, string> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
    if (SECRET_SETTING_KEYS.has(key)) continue;
    merged[key] = map.get(key) ?? DEFAULT_SETTINGS[key];
  }
  return {
    ...(merged as unknown as SiteSettings),
    hasAiApiKey: map.get("aiApiKey") ? "true" : "false",
    features: parseFeatures(merged.features),
    services: parseServices(merged.services),
  };
}

export const getGallery = cache(async (siteId?: number | null) => {
  if (siteId) {
    return db
      .select()
      .from(galleryImages)
      .where(eq(galleryImages.siteId, siteId))
      .orderBy(asc(galleryImages.sortOrder), desc(galleryImages.createdAt));
  }
  return db
    .select()
    .from(galleryImages)
    .orderBy(asc(galleryImages.sortOrder), desc(galleryImages.createdAt));
});

export const getMenu = cache(async (siteId?: number | null) => {
  const categories = siteId
    ? await db
        .select()
        .from(menuCategories)
        .where(eq(menuCategories.siteId, siteId))
        .orderBy(asc(menuCategories.sortOrder))
    : await db
        .select()
        .from(menuCategories)
        .orderBy(asc(menuCategories.sortOrder));
  const items = siteId
    ? await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.siteId, siteId))
        .orderBy(asc(menuItems.sortOrder))
    : await db
        .select()
        .from(menuItems)
        .orderBy(asc(menuItems.sortOrder));
  return categories.map((category) => ({
    ...category,
    items: items.filter((i) => i.categoryId === category.id),
  }));
});

export const getFeaturedItems = cache(async (siteId?: number | null) => {
  if (siteId) {
    return db
      .select()
      .from(menuItems)
      .where(eq(menuItems.siteId, siteId))
      .orderBy(asc(menuItems.sortOrder));
  }
  return db
    .select()
    .from(menuItems)
    .orderBy(asc(menuItems.sortOrder));
});

export async function getNavLinks(siteId?: number | null) {
  if (siteId) {
    return db
      .select()
      .from(navLinks)
      .where(eq(navLinks.siteId, siteId))
      .orderBy(asc(navLinks.sortOrder));
  }
  return db
    .select()
    .from(navLinks)
    .orderBy(asc(navLinks.sortOrder));
}

export async function getHomeSections(siteId?: number | null) {
  if (siteId) {
    return db
      .select()
      .from(homeSections)
      .where(eq(homeSections.siteId, siteId))
      .orderBy(asc(homeSections.sortOrder));
  }
  return db
    .select()
    .from(homeSections)
    .where(eq(homeSections.visible, true))
    .orderBy(asc(homeSections.sortOrder));
}

// ─── Page Builder (new system) ───────────────────────────────────────────────

export async function getPageBySlug(siteId: number, slug: string) {
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.siteId, siteId), eq(pages.slug, slug)));
  return page ?? null;
}

export async function getPageBlocks(pageId: number) {
  return db
    .select()
    .from(pageBlocks)
    .where(eq(pageBlocks.pageId, pageId))
    .orderBy(asc(pageBlocks.sortOrder));
}

export async function getSitePages(siteId: number) {
  return db
    .select()
    .from(pages)
    .where(eq(pages.siteId, siteId))
    .orderBy(asc(pages.sortOrder));
}

// ─── Auto-resolving versions (use site from request context) ─────────────────

export const getResolvedSiteSettings = cache(async (): Promise<SiteSettings> => {
  const siteId = await getResolvedSiteId();
  return getSiteSettings(siteId);
});

export const getResolvedGallery = cache(async () => {
  const siteId = await getResolvedSiteId();
  return getGallery(siteId);
});

export const getResolvedMenu = cache(async () => {
  const siteId = await getResolvedSiteId();
  return getMenu(siteId);
});

export const getResolvedFeaturedItems = cache(async () => {
  const siteId = await getResolvedSiteId();
  return getFeaturedItems(siteId);
});

export const getResolvedNavLinks = cache(async () => {
  const siteId = await getResolvedSiteId();
  return getNavLinks(siteId);
});

export const getResolvedHomeSections = cache(async () => {
  const siteId = await getResolvedSiteId();
  return getHomeSections(siteId);
});
