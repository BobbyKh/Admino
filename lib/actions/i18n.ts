"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  siteLocales,
  pages,
  pageBlocks,
  pageTranslations,
  blockTranslations,
} from "@/lib/db/schema";
import { getResolvedSiteId } from "@/lib/site-context";
import { requireAdmin } from "@/lib/auth";
import { getSiteLocales, DEFAULT_LOCALE } from "@/lib/i18n";

// ─── Locale Management ───────────────────────────────────────────────────────

export async function getLocales() {
  return getSiteLocales();
}

const localeSchema = z.object({
  code: z.string().min(2).max(10),
  name: z.string().min(1).max(50),
});

export async function addLocale(_prev: unknown, formData: FormData) {
  const user = await requireAdmin();
  if (!user.siteId) return { success: false, message: "No site assigned." };

  const parsed = localeSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const code = parsed.data.code.toLowerCase();

  // Check if locale already exists for this site
  const existing = await db
    .select({ id: siteLocales.id })
    .from(siteLocales)
    .where(and(eq(siteLocales.siteId, user.siteId), eq(siteLocales.code, code)))
    .limit(1);

  if (existing.length > 0) {
    return { success: false, message: "Locale already exists." };
  }

  // Get max sort order
  const maxSort = await db
    .select({ sortOrder: siteLocales.sortOrder })
    .from(siteLocales)
    .where(eq(siteLocales.siteId, user.siteId))
    .orderBy(siteLocales.sortOrder);

  const isDefault = maxSort.length === 0; // First locale is default

  await db.insert(siteLocales).values({
    siteId: user.siteId,
    code,
    name: parsed.data.name,
    isDefault,
    sortOrder: maxSort.length > 0 ? maxSort[maxSort.length - 1].sortOrder + 1 : 0,
  });

  revalidatePath("/admin/i18n");
  return { success: true, message: "Locale added." };
}

export async function deleteLocale(localeId: number) {
  const user = await requireAdmin();
  if (!user.siteId) return { success: false, message: "No site assigned." };

  const [locale] = await db
    .select()
    .from(siteLocales)
    .where(and(eq(siteLocales.id, localeId), eq(siteLocales.siteId, user.siteId)));

  if (!locale) return { success: false, message: "Locale not found." };
  if (locale.isDefault) return { success: false, message: "Cannot delete the default locale." };

  // Delete translations for this locale
  await db.delete(pageTranslations).where(eq(pageTranslations.locale, locale.code));
  await db.delete(blockTranslations).where(eq(blockTranslations.locale, locale.code));
  await db.delete(siteLocales).where(eq(siteLocales.id, localeId));

  revalidatePath("/admin/i18n");
  return { success: true, message: "Locale deleted." };
}

export async function setDefaultLocale(localeId: number) {
  const user = await requireAdmin();
  if (!user.siteId) return { success: false, message: "No site assigned." };

  // Unset all defaults
  await db
    .update(siteLocales)
    .set({ isDefault: false })
    .where(eq(siteLocales.siteId, user.siteId));

  // Set new default
  await db
    .update(siteLocales)
    .set({ isDefault: true })
    .where(and(eq(siteLocales.id, localeId), eq(siteLocales.siteId, user.siteId)));

  revalidatePath("/admin/i18n");
  return { success: true, message: "Default locale updated." };
}

// ─── Translation Management ──────────────────────────────────────────────────

export async function getPageTranslations(pageId: number) {
  const user = await requireAdmin();
  if (!user.siteId) return [];

  const locales = await getSiteLocales();
  const translations = await db
    .select()
    .from(pageTranslations)
    .where(eq(pageTranslations.pageId, pageId));

  const translationMap = new Map(translations.map((t) => [t.locale, t]));

  return locales.map((locale) => ({
    locale: locale.code,
    name: locale.name,
    isDefault: locale.isDefault,
    translation: translationMap.get(locale.code) ?? null,
  }));
}

export async function getBlockTranslations(blockId: number) {
  const user = await requireAdmin();
  if (!user.siteId) return [];

  const locales = await getSiteLocales();
  const translations = await db
    .select()
    .from(blockTranslations)
    .where(eq(blockTranslations.blockId, blockId));

  const translationMap = new Map(translations.map((t) => [t.locale, t]));

  return locales.map((locale) => ({
    locale: locale.code,
    name: locale.name,
    isDefault: locale.isDefault,
    translation: translationMap.get(locale.code) ?? null,
  }));
}

const pageTranslationSchema = z.object({
  locale: z.string().min(2).max(10),
  title: z.string().max(200).optional(),
  slug: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
});

export async function savePageTranslation(
  _prev: unknown,
  formData: FormData
) {
  const user = await requireAdmin();
  if (!user.siteId) return { success: false, message: "No site assigned." };

  const pageId = Number(formData.get("pageId"));
  const parsed = pageTranslationSchema.safeParse({
    locale: formData.get("locale"),
    title: formData.get("title") || undefined,
    slug: formData.get("slug") || undefined,
    description: formData.get("description") || undefined,
    metaTitle: formData.get("metaTitle") || undefined,
    metaDescription: formData.get("metaDescription") || undefined,
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (parsed.data.locale === DEFAULT_LOCALE) {
    // Update the original page
    const updates: Record<string, string> = { updatedAt: new Date().toISOString() };
    if (parsed.data.title) updates.title = parsed.data.title;
    if (parsed.data.slug) updates.slug = parsed.data.slug;
    if (parsed.data.description) updates.description = parsed.data.description;
    if (parsed.data.metaTitle) updates.metaTitle = parsed.data.metaTitle;
    if (parsed.data.metaDescription) updates.metaDescription = parsed.data.metaDescription;

    await db.update(pages).set(updates).where(eq(pages.id, pageId));
  } else {
    // Upsert translation
    const existing = await db
      .select({ id: pageTranslations.id })
      .from(pageTranslations)
      .where(and(eq(pageTranslations.pageId, pageId), eq(pageTranslations.locale, parsed.data.locale)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(pageTranslations)
        .set({ ...parsed.data, updatedAt: new Date().toISOString() })
        .where(eq(pageTranslations.id, existing[0].id));
    } else {
      await db.insert(pageTranslations).values({
        pageId,
        ...parsed.data,
      });
    }
  }

  revalidatePath("/admin/pages");
  revalidatePath("/");
  return { success: true, message: "Translation saved." };
}

const blockTranslationSchema = z.object({
  locale: z.string().min(2).max(10),
  title: z.string().max(200).optional(),
  config: z.string().optional(),
});

export async function saveBlockTranslation(
  _prev: unknown,
  formData: FormData
) {
  const user = await requireAdmin();
  if (!user.siteId) return { success: false, message: "No site assigned." };

  const blockId = Number(formData.get("blockId"));
  const parsed = blockTranslationSchema.safeParse({
    locale: formData.get("locale"),
    title: formData.get("title") || undefined,
    config: formData.get("config") || undefined,
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (parsed.data.locale === DEFAULT_LOCALE) {
    // Update the original block
    const updates: Record<string, string> = { updatedAt: new Date().toISOString() };
    if (parsed.data.title) updates.title = parsed.data.title;
    if (parsed.data.config) updates.config = parsed.data.config;

    await db.update(pageBlocks).set(updates).where(eq(pageBlocks.id, blockId));
  } else {
    const existing = await db
      .select({ id: blockTranslations.id })
      .from(blockTranslations)
      .where(and(eq(blockTranslations.blockId, blockId), eq(blockTranslations.locale, parsed.data.locale)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(blockTranslations)
        .set({ ...parsed.data, updatedAt: new Date().toISOString() })
        .where(eq(blockTranslations.id, existing[0].id));
    } else {
      await db.insert(blockTranslations).values({
        blockId,
        ...parsed.data,
      });
    }
  }

  revalidatePath("/");
  return { success: true, message: "Block translation saved." };
}
