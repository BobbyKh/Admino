"use server";

import { and, eq, inArray } from "drizzle-orm";
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
import { requireActionRole } from "@/lib/auth";
import { getSiteLocalesById, DEFAULT_LOCALE } from "@/lib/i18n";
import { getCurrentAdminSiteId } from "@/lib/tenant-access";
import { requirePageAccess, requirePageBlockAccess } from "@/lib/tenant-access";

// ─── Locale Management ───────────────────────────────────────────────────────

export async function getLocales() {
  await requireActionRole("viewer");
  const siteId = await getCurrentAdminSiteId();
  await ensureSourceLocale(siteId);
  return getSiteLocalesById(siteId);
}

const localeSchema = z.object({
  code: z.string().trim().toLowerCase().regex(/^[a-z]{2,3}(?:-[a-z]{2})?$/, "Use a valid language code such as ne or ne-np."),
  name: z.string().trim().min(1).max(50),
});

async function ensureSourceLocale(siteId: number) {
  const rows = await db.select().from(siteLocales).where(eq(siteLocales.siteId, siteId));
  if (rows.some((locale) => locale.code === DEFAULT_LOCALE)) return;
  await db.transaction(async (tx) => {
    if (rows.length === 1 && rows[0].isDefault) {
      await tx.update(siteLocales).set({ isDefault: false }).where(and(eq(siteLocales.id, rows[0].id), eq(siteLocales.siteId, siteId)));
    }
    await tx.insert(siteLocales).values({
      siteId,
      code: DEFAULT_LOCALE,
      name: "English",
      isDefault: rows.length === 0 || (rows.length === 1 && rows[0].isDefault),
      sortOrder: 0,
    }).onConflictDoNothing();
  });
}

export async function addLocale(_prev: unknown, formData: FormData) {
  await requireActionRole("admin");
  const siteId = await getCurrentAdminSiteId();
  await ensureSourceLocale(siteId);

  const parsed = localeSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const code = parsed.data.code;

  // Check if locale already exists for this site
  const existing = await db
    .select({ id: siteLocales.id })
    .from(siteLocales)
    .where(and(eq(siteLocales.siteId, siteId), eq(siteLocales.code, code)))
    .limit(1);

  if (existing.length > 0) {
    return { success: false, message: "Locale already exists." };
  }

  // Get max sort order
  const maxSort = await db
    .select({ sortOrder: siteLocales.sortOrder })
    .from(siteLocales)
    .where(eq(siteLocales.siteId, siteId))
    .orderBy(siteLocales.sortOrder);

  const isDefault = maxSort.length === 0; // First locale is default

  await db.insert(siteLocales).values({
    siteId,
    code,
    name: parsed.data.name,
    isDefault,
    sortOrder: maxSort.length > 0 ? maxSort[maxSort.length - 1].sortOrder + 1 : 0,
  });

  revalidatePath("/admin/i18n");
  revalidatePath("/", "layout");
  return { success: true, message: "Locale added." };
}

export async function deleteLocale(localeId: number) {
  await requireActionRole("admin");
  const siteId = await getCurrentAdminSiteId();

  const [locale] = await db
    .select()
    .from(siteLocales)
    .where(and(eq(siteLocales.id, localeId), eq(siteLocales.siteId, siteId)));

  if (!locale) return { success: false, message: "Locale not found." };
  if (locale.isDefault) return { success: false, message: "Cannot delete the default locale." };

  await db.transaction(async (tx) => {
    const sitePages = await tx.select({ id: pages.id }).from(pages).where(eq(pages.siteId, siteId));
    const pageIds = sitePages.map((page) => page.id);
    if (pageIds.length > 0) {
      const siteBlocks = await tx.select({ id: pageBlocks.id }).from(pageBlocks).where(inArray(pageBlocks.pageId, pageIds));
      const blockIds = siteBlocks.map((block) => block.id);
      await tx.delete(pageTranslations).where(and(eq(pageTranslations.locale, locale.code), inArray(pageTranslations.pageId, pageIds)));
      if (blockIds.length > 0) {
        await tx.delete(blockTranslations).where(and(eq(blockTranslations.locale, locale.code), inArray(blockTranslations.blockId, blockIds)));
      }
    }
    await tx.delete(siteLocales).where(and(eq(siteLocales.id, localeId), eq(siteLocales.siteId, siteId)));
  });

  revalidatePath("/admin/i18n");
  revalidatePath("/", "layout");
  return { success: true, message: "Locale deleted." };
}

export async function setDefaultLocale(localeId: number) {
  await requireActionRole("admin");
  const siteId = await getCurrentAdminSiteId();

  const [target] = await db.select({ id: siteLocales.id }).from(siteLocales).where(and(eq(siteLocales.id, localeId), eq(siteLocales.siteId, siteId)));
  if (!target) return { success: false, message: "Locale not found." };

  await db.transaction(async (tx) => {
    await tx.update(siteLocales).set({ isDefault: false }).where(eq(siteLocales.siteId, siteId));
    await tx.update(siteLocales).set({ isDefault: true }).where(and(eq(siteLocales.id, localeId), eq(siteLocales.siteId, siteId)));
  });

  revalidatePath("/admin/i18n");
  revalidatePath("/", "layout");
  return { success: true, message: "Default locale updated." };
}

// ─── Translation Management ──────────────────────────────────────────────────

export async function getPageTranslations(pageId: number) {
  const page = await requirePageAccess(pageId);

  const locales = await getSiteLocalesById(page.siteId);
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
  const block = await requirePageBlockAccess(blockId);
  const page = await requirePageAccess(block.pageId);

  const locales = await getSiteLocalesById(page.siteId);
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
  await requireActionRole("editor");
  const pageId = Number(formData.get("pageId"));
  const page = await requirePageAccess(pageId);
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
  const locale = parsed.data.locale.toLowerCase();
  if (!(await isSiteLocale(page.siteId, locale))) return { success: false, message: "Locale is not enabled for this site." };

  if (locale === DEFAULT_LOCALE) {
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
      .where(and(eq(pageTranslations.pageId, pageId), eq(pageTranslations.locale, locale)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(pageTranslations)
        .set({ ...parsed.data, locale, updatedAt: new Date().toISOString() })
        .where(eq(pageTranslations.id, existing[0].id));
    } else {
      await db.insert(pageTranslations).values({
        pageId,
        ...parsed.data,
        locale,
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
  await requireActionRole("editor");
  const blockId = Number(formData.get("blockId"));
  const block = await requirePageBlockAccess(blockId);
  const page = await requirePageAccess(block.pageId);
  const parsed = blockTranslationSchema.safeParse({
    locale: formData.get("locale"),
    title: formData.get("title") || undefined,
    config: formData.get("config") || undefined,
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const locale = parsed.data.locale.toLowerCase();
  if (!(await isSiteLocale(page.siteId, locale))) return { success: false, message: "Locale is not enabled for this site." };

  if (locale === DEFAULT_LOCALE) {
    // Update the original block
    const updates: Record<string, string> = { updatedAt: new Date().toISOString() };
    if (parsed.data.title) updates.title = parsed.data.title;
    if (parsed.data.config) updates.config = parsed.data.config;

    await db.update(pageBlocks).set(updates).where(and(eq(pageBlocks.id, blockId), eq(pageBlocks.pageId, page.id)));
  } else {
    const existing = await db
      .select({ id: blockTranslations.id })
      .from(blockTranslations)
      .where(and(eq(blockTranslations.blockId, blockId), eq(blockTranslations.locale, locale)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(blockTranslations)
        .set({ ...parsed.data, locale, updatedAt: new Date().toISOString() })
        .where(eq(blockTranslations.id, existing[0].id));
    } else {
      await db.insert(blockTranslations).values({
        blockId,
        ...parsed.data,
        locale,
      });
    }
  }

  revalidatePath("/");
  return { success: true, message: "Block translation saved." };
}

async function isSiteLocale(siteId: number, locale: string) {
  if (locale === DEFAULT_LOCALE) return true;
  const [row] = await db
    .select({ id: siteLocales.id })
    .from(siteLocales)
    .where(and(eq(siteLocales.siteId, siteId), eq(siteLocales.code, locale), eq(siteLocales.active, true)));
  return Boolean(row);
}
