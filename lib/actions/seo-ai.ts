"use server";

import { z } from "zod";
import { hasMinRole, type Role } from "@/lib/auth";
import { db } from "@/lib/db";
import { pageBlocks } from "@/lib/db/schema";
import { getAllServerSettings } from "@/lib/data";
import { requirePageAccess, requireSiteAccess } from "@/lib/tenant-access";
import { requireTenantFeature } from "@/lib/tenant-features";
import { eq, asc } from "drizzle-orm";
import { callAiProvider } from "@/lib/ai-provider";

export type GeneratedSeoMetadata = {
  metaTitle: string;
  metaDescription: string;
};

export type GenerateSeoResult = { metadata: GeneratedSeoMetadata } | { error: string };

/**
 * Generates SEO meta title and meta description for a site page using configured AI.
 */
export async function generateSeoMetadataWithAi(
  pageId: number,
  keywords?: string
): Promise<GenerateSeoResult> {
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

    const blocks = await db
      .select({ title: pageBlocks.title, type: pageBlocks.type, config: pageBlocks.config })
      .from(pageBlocks)
      .where(eq(pageBlocks.pageId, pageId))
      .orderBy(asc(pageBlocks.sortOrder))
      .limit(6);

    const contextSnippet = blocks
      .map((b) => `Block (${b.type}): ${b.title || ""} ${b.config ? b.config.slice(0, 150) : ""}`)
      .join("\n");

    const userInstruction = keywords ? `Focus keywords: ${keywords.trim()}` : "Optimize for web search engines.";

    const systemPrompt = `You write SEO meta titles and meta descriptions for website pages.
Return ONLY a valid JSON object with keys "metaTitle" and "metaDescription".
- "metaTitle": concise (30-60 chars) including primary subject.
- "metaDescription": compelling summary (110-155 chars) with clear value proposition.
Do not include markdown code block syntax.`;

    const userPrompt = `Page Title: "${page.title}"\nPage Content Context:\n${contextSnippet}\n\nInstructions: ${userInstruction}`;

    const content = await callAiProvider({
      provider: settings.aiProvider,
      apiKey: settings.aiApiKey,
      model: settings.aiModel,
      baseUrl: settings.aiBaseUrl,
      systemPrompt,
      userPrompt,
      maxTokens: 600,
      temperature: 0.5,
    });

    const parsed = extractJsonPayload(content) as Record<string, string>;
    const schema = z.object({
      metaTitle: z.string().trim().min(5).max(70),
      metaDescription: z.string().trim().min(20).max(180),
    });

    const validated = schema.parse(parsed);
    return { metadata: validated };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to generate SEO metadata." };
  }
}

function extractJsonPayload(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) throw new Error("Invalid JSON from AI.");
    return JSON.parse(content.slice(start, end + 1));
  }
}
