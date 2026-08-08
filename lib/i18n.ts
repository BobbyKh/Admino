import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteLocales, pages, pageBlocks, pageTranslations, blockTranslations } from "@/lib/db/schema";
import { getResolvedSiteId } from "@/lib/site-context";

export const DEFAULT_LOCALE = "en";

export type Locale = {
  id: number;
  code: string;
  name: string;
  isDefault: boolean;
  active: boolean;
};

/**
 * Get all active locales for the current site.
 */
export async function getSiteLocales(): Promise<Locale[]> {
  const siteId = await getResolvedSiteId();
  if (!siteId) return [{ id: 0, code: "en", name: "English", isDefault: true, active: true }];

  const locales = await db
    .select()
    .from(siteLocales)
    .where(and(eq(siteLocales.siteId, siteId), eq(siteLocales.active, true)))
    .orderBy(siteLocales.sortOrder);

  if (locales.length === 0) {
    return [{ id: 0, code: "en", name: "English", isDefault: true, active: true }];
  }

  return locales.map((l) => ({
    id: l.id,
    code: l.code,
    name: l.name,
    isDefault: l.isDefault,
    active: l.active,
  }));
}

/**
 * Resolve the current locale from URL path, cookie, or Accept-Language header.
 */
export const getResolvedLocale = cache(async (): Promise<string> => {
  const hdrs = await headers();
  const cookieStore = await cookies();

  // 1. Check for locale in x-locale header (set by middleware)
  const headerLocale = hdrs.get("x-locale");
  if (headerLocale) return headerLocale;

  // 2. Check cookie
  const cookieLocale = cookieStore.get("admino_locale")?.value;
  if (cookieLocale) return cookieLocale;

  // 3. Check Accept-Language header
  const acceptLanguage = hdrs.get("accept-language");
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(",")
      .map((lang) => {
        const [code, q] = lang.trim().split(";");
        return { code: code.split("-")[0].toLowerCase(), q: q ? parseFloat(q.replace("q=", "")) : 1 };
      })
      .sort((a, b) => b.q - a.q);

    const locales = await getSiteLocales();
    const localeCodes = new Set(locales.map((l) => l.code));

    for (const { code } of preferred) {
      if (localeCodes.has(code)) return code;
    }
  }

  // 4. Default locale
  const locales = await getSiteLocales();
  const defaultLocale = locales.find((l) => l.isDefault);
  return defaultLocale?.code ?? DEFAULT_LOCALE;
});

/**
 * Get a page with its translation for the given locale.
 */
export async function getTranslatedPage(pageId: number, locale: string) {
  const defaultPage = await db
    .select()
    .from(pages)
    .where(eq(pages.id, pageId))
    .limit(1);

  if (defaultPage.length === 0) return null;

  if (locale === DEFAULT_LOCALE) {
    return defaultPage[0];
  }

  const [translation] = await db
    .select()
    .from(pageTranslations)
    .where(and(eq(pageTranslations.pageId, pageId), eq(pageTranslations.locale, locale)))
    .limit(1);

  if (!translation) return defaultPage[0];

  return {
    ...defaultPage[0],
    title: translation.title ?? defaultPage[0].title,
    slug: translation.slug ?? defaultPage[0].slug,
    description: translation.description ?? defaultPage[0].description,
    metaTitle: translation.metaTitle ?? defaultPage[0].metaTitle,
    metaDescription: translation.metaDescription ?? defaultPage[0].metaDescription,
  };
}

/**
 * Get a block with its translation for the given locale.
 */
export async function getTranslatedBlock(blockId: number, locale: string) {
  const defaultBlock = await db
    .select()
    .from(pageBlocks)
    .where(eq(pageBlocks.id, blockId))
    .limit(1);

  if (defaultBlock.length === 0) return null;

  if (locale === DEFAULT_LOCALE) {
    return defaultBlock[0];
  }

  const [translation] = await db
    .select()
    .from(blockTranslations)
    .where(and(eq(blockTranslations.blockId, blockId), eq(blockTranslations.locale, locale)))
    .limit(1);

  if (!translation) return defaultBlock[0];

  return {
    ...defaultBlock[0],
    title: translation.title ?? defaultBlock[0].title,
    config: translation.config ?? defaultBlock[0].config,
  };
}

/**
 * Get translated blocks for a page in the given locale.
 */
export async function getTranslatedPageBlocks(pageId: number, locale: string) {
  const blocks = await db
    .select()
    .from(pageBlocks)
    .where(eq(pageBlocks.pageId, pageId))
    .orderBy(pageBlocks.sortOrder);

  if (locale === DEFAULT_LOCALE) {
    return blocks;
  }

  const translations = await db
    .select()
    .from(blockTranslations)
    .where(eq(blockTranslations.locale, locale));

  const translationMap = new Map(translations.map((t) => [t.blockId, t]));

  return blocks.map((block) => {
    const translation = translationMap.get(block.id);
    if (!translation) return block;
    return {
      ...block,
      title: translation.title ?? block.title,
      config: translation.config ?? block.config,
    };
  });
}
