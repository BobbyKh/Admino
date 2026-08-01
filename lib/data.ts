import "server-only";

import { cache } from "react";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  galleryImages,
  homeSections,
  menuCategories,
  menuItems,
  navLinks,
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

async function getSettingsRows() {
  const rows = await db.select().from(settings);
  return new Map(rows.map((r) => [r.key, r.value]));
}

/** Merges public DB settings over defaults (secrets excluded) and parses JSON fields. */
export async function getSiteSettings(): Promise<SiteSettings> {
  const map = await getSettingsRows();
  // Build from scratch so credential keys never enter the public object.
  const merged: Record<string, string> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
    if (SECRET_SETTING_KEYS.has(key)) continue;
    merged[key] = map.get(key) ?? DEFAULT_SETTINGS[key];
  }
  return {
    ...(merged as unknown as SiteSettings),
    features: parseFeatures(merged.features),
    services: parseServices(merged.services),
  };
}

export const getGallery = cache(async () => {
  return db
    .select()
    .from(galleryImages)
    .orderBy(asc(galleryImages.sortOrder), desc(galleryImages.createdAt));
});

export const getMenu = cache(async () => {
  const categories = await db
    .select()
    .from(menuCategories)
    .orderBy(asc(menuCategories.sortOrder));
  const items = await db
    .select()
    .from(menuItems)
    .orderBy(asc(menuItems.sortOrder));
  return categories.map((category) => ({
    ...category,
    items: items.filter((i) => i.categoryId === category.id),
  }));
});

export const getFeaturedItems = cache(async () => {
  return db
    .select()
    .from(menuItems)
    .where(eq(menuItems.featured, true))
    .orderBy(asc(menuItems.sortOrder));
});

export async function getNavLinks() {
  return db
    .select()
    .from(navLinks)
    .where(eq(navLinks.visible, true))
    .orderBy(asc(navLinks.sortOrder));
}

export async function getHomeSections() {
  return db
    .select()
    .from(homeSections)
    .where(eq(homeSections.visible, true))
    .orderBy(asc(homeSections.sortOrder));
}
