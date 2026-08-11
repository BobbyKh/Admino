"use server";

import { z } from "zod";
import { and, eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { blockTranslations, pageBlocks, siteLocales } from "@/lib/db/schema";
import { hasMinRole, type Role } from "@/lib/auth";
import { getAllServerSettings } from "@/lib/data";
import { requirePageAccess, requireSiteAccess } from "@/lib/tenant-access";
import { requireTenantFeature } from "@/lib/tenant-features";
import { callAiProvider } from "@/lib/ai-provider";

export type TranslatePageResult = { success: boolean; message: string; translatedBlocksCount?: number } | { error: string };

/**
 * Translates all page blocks on a page into a target language using AI while preserving block schema structure.
 */
export async function translatePageBlocksWithAi(
  pageId: number,
  targetLocale: string
): Promise<TranslatePageResult> {
  try {
    const page = await requirePageAccess(pageId);
    const user = await requireSiteAccess(page.siteId);
    if (!hasMinRole((user.role as Role) ?? "viewer", "editor")) {
      throw new Error("Forbidden");
    }
    await requireTenantFeature(page.siteId, "ai_block_assistant", {
      role: user.role as Role,
      userId: user.id,
    });

    const localeCode = z.string().trim().toLowerCase().min(2).max(10).parse(targetLocale);
    const [locale] = await db.select().from(siteLocales).where(and(eq(siteLocales.siteId, page.siteId), eq(siteLocales.code, localeCode), eq(siteLocales.active, true)));
    if (!locale) throw new Error("Target locale is not enabled for this site.");

    const settings = await getAllServerSettings(page.siteId);
    if (!settings.aiApiKey) {
      throw new Error("Configure an AI API key in Settings → Integrations first.");
    }

    const lang = locale.name;
    const blocks = await db
      .select()
      .from(pageBlocks)
      .where(eq(pageBlocks.pageId, pageId))
      .orderBy(asc(pageBlocks.sortOrder));

    if (blocks.length === 0) {
      return { success: false, message: "Page has no blocks to translate." };
    }

    const blockPayload = blocks.map((b) => ({
      id: b.id,
      type: b.type,
      title: b.title,
      config: b.config ? safeParseJson(b.config) : {},
    }));

    const systemPrompt = `You are a professional website translator and localization specialist.
Translate all human-readable text values inside the provided page blocks array into ${lang}.
Return ONLY a valid JSON array of block objects matching the input format.
- Preserve block IDs, block types, structural keys, links, URLs, images, numbers, and colors unchanged.
- Translate titles, subtitles, text content, badges, button labels, questions, and answers into natural ${lang}.
- Keep HTML formatting tags (<b>, <i>, <p>, <h2>) intact.
Do not include markdown code block formatting.`;

    const userPrompt = `Target Language: ${lang}\nBlocks Array:\n${JSON.stringify(blockPayload)}`;

    const rawContent = await callAiProvider({
      provider: settings.aiProvider,
      apiKey: settings.aiApiKey,
      model: settings.aiModel,
      baseUrl: settings.aiBaseUrl,
      systemPrompt,
      userPrompt,
      maxTokens: 2400,
      temperature: 0.3,
    });

    let translatedArray: Array<{ id: number; title?: string | null; config?: Record<string, unknown> }>;
    try {
      const parsedObj = JSON.parse(rawContent) as Record<string, unknown>;
      translatedArray = Array.isArray(parsedObj)
        ? (parsedObj as typeof translatedArray)
        : (parsedObj.blocks as typeof translatedArray) || [];
    } catch {
      throw new Error("Failed to parse translated blocks JSON.");
    }

    let updatedCount = 0;
    const allowedBlockIds = new Set(blocks.map((block) => block.id));
    await db.transaction(async (tx) => {
      for (const item of translatedArray) {
        if (typeof item.id !== "number" || !allowedBlockIds.has(item.id)) continue;
        const updates: { title?: string | null; config?: string; updatedAt: string } = { updatedAt: new Date().toISOString() };
        if (item.title !== undefined) updates.title = item.title;
        if (item.config !== undefined) updates.config = JSON.stringify(item.config);
        if (item.title === undefined && item.config === undefined) continue;

        await tx.insert(blockTranslations).values({ blockId: item.id, locale: locale.code, title: updates.title, config: updates.config, updatedAt: updates.updatedAt }).onConflictDoUpdate({
          target: [blockTranslations.blockId, blockTranslations.locale],
          set: updates,
        });
        updatedCount++;
      }
    });

    if (updatedCount === 0) throw new Error("AI returned no usable translated blocks.");
    revalidatePath("/");
    revalidatePath(`/${page.slug}`);
    return {
      success: true,
      message: `Successfully translated ${updatedCount} blocks into ${lang}.`,
      translatedBlocksCount: updatedCount,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to translate page." };
  }
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
