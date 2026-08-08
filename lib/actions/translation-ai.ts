"use server";

import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { pageBlocks, pageRevisions } from "@/lib/db/schema";
import { hasMinRole, type Role } from "@/lib/auth";
import { getAllServerSettings } from "@/lib/data";
import { requirePageAccess, requireSiteAccess } from "@/lib/tenant-access";
import { requireTenantFeature } from "@/lib/tenant-features";

export type TranslatePageResult = { success: boolean; message: string; translatedBlocksCount?: number } | { error: string };

/**
 * Translates all page blocks on a page into a target language using AI while preserving block schema structure.
 */
export async function translatePageBlocksWithAi(
  pageId: number,
  targetLanguage: string
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

    const settings = await getAllServerSettings(page.siteId);
    if (!settings.aiApiKey) {
      throw new Error("Configure an AI API key in Settings → Integrations first.");
    }

    const lang = z.string().trim().min(2, "Enter target language.").max(60).parse(targetLanguage);
    const blocks = await db
      .select()
      .from(pageBlocks)
      .where(eq(pageBlocks.pageId, pageId))
      .orderBy(asc(pageBlocks.sortOrder));

    if (blocks.length === 0) {
      return { success: false, message: "Page has no blocks to translate." };
    }

    // Save snapshot before translation
    await db.insert(pageRevisions).values({
      pageId,
      userId: user.id,
      label: `Before AI Translation to ${lang}`,
      snapshot: JSON.stringify({ blocks }),
    });

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

    const res = await fetch(`${settings.aiBaseUrl || "https://api.openai.com/v1"}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings.aiApiKey}` },
      body: JSON.stringify({
        model: settings.aiModel || "gpt-4o-mini",
        max_tokens: 2400,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) throw new Error("AI translation request failed.");
    const data = await res.json();
    const rawContent = String(data.choices?.[0]?.message?.content ?? "[]");

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
    await db.transaction(async (tx) => {
      for (const item of translatedArray) {
        if (typeof item.id !== "number") continue;
        const updates: { title?: string | null; config?: string; updatedAt: string } = {
          updatedAt: new Date().toISOString(),
        };
        if (item.title !== undefined) updates.title = item.title;
        if (item.config !== undefined) updates.config = JSON.stringify(item.config);

        await tx.update(pageBlocks).set(updates).where(eq(pageBlocks.id, item.id));
        updatedCount++;
      }
    });

    return {
      success: true,
      message: `Successfully translated ${updatedCount} blocks into ${lang}. Snapshot created.`,
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
