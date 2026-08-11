"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { pageBlocks, pages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAllServerSettings } from "@/lib/data";
import { requireSiteAccess } from "@/lib/tenant-access";
import { BLOCK_TYPES } from "@/lib/blocks";
import { revalidatePath } from "next/cache";
import { callAiProvider } from "@/lib/ai-provider";
import { hasMinRole, type Role } from "@/lib/auth";
import { requireTenantFeature } from "@/lib/tenant-features";

const generateLayoutSchema = z.object({
  pageId: z.number().int().positive(),
  description: z.string().min(10).max(2000),
});

function buildBlockTypeReference(): string {
  return BLOCK_TYPES.map((bt) => {
    const configKeys = Object.keys(bt.defaultConfig);
    return `- ${bt.type} (${bt.label}): ${bt.description}. Config keys: ${configKeys.join(", ")}`;
  }).join("\n");
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function generatePageLayoutWithAi(
  _prev: unknown,
  formData: FormData
): Promise<{ success: boolean; message: string; blocks?: Array<{ type: string; config: Record<string, unknown>; title?: string }> }> {
  const pageId = Number(formData.get("pageId"));
  const description = String(formData.get("description") ?? "");

  const parsed = generateLayoutSchema.safeParse({ pageId, description });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const page = await db.select().from(pages).where(eq(pages.id, parsed.data.pageId)).limit(1);
  if (page.length === 0) return { success: false, message: "Page not found." };

  const siteId = page[0].siteId;

  const access = await requireSiteAccess(siteId);
  if (!hasMinRole((access.role as Role) ?? "viewer", "editor")) return { success: false, message: "Access denied." };
  await requireTenantFeature(siteId, "ai_block_assistant", { role: access.role as Role, userId: access.id });

  const settings = await getAllServerSettings(siteId);

  if (!settings.aiApiKey) {
    return { success: false, message: "AI is not configured. Add an API key in Settings → AI." };
  }

  const blockTypeRef = buildBlockTypeReference();

  const systemPrompt = `You are an expert website layout designer. Generate a complete page layout as a JSON array of blocks.

AVAILABLE BLOCK TYPES:
${blockTypeRef}

RULES:
1. Return ONLY a JSON array of block objects. No markdown, no explanations.
2. Each block must have: { "type": "...", "title": "...(optional)", "config": {...} }
3. Use ONLY the block types listed above.
4. Config values should be realistic and contextual based on the description.
5. Order blocks logically (hero first, then content, then CTA at the end).
6. Generate 4-12 blocks for a complete page.
7. Use descriptive titles and content relevant to the description.
8. For image fields, use empty string "" (images will be added later).

Example output:
[
  { "type": "hero", "title": "Main Hero", "config": { "title": "Welcome to Our Restaurant", "subtitle": "Authentic Italian cuisine in the heart of the city", "image": "", "ctaPrimary": "View Menu", "ctaPrimaryLink": "/menu", "ctaSecondary": "Reserve Table", "ctaSecondaryLink": "/book" } },
  { "type": "features", "title": "Why Choose Us", "config": { "title": "Why Choose Us", "subtitle": "We bring the best experience", "columns": "3", "items": [{ "icon": "star", "title": "Fresh Ingredients", "text": "Locally sourced daily" }, { "icon": "star", "title": "Expert Chefs", "text": "20+ years experience" }, { "icon": "star", "title": "Fast Delivery", "text": "Under 30 minutes" }] } },
  { "type": "cta", "title": "Get Started", "config": { "title": "Ready to Experience the Best?", "subtitle": "Book your table today", "buttonText": "Book Now", "buttonLink": "/book" } }
]`;

  const userPrompt = `Generate a complete page layout for: "${parsed.data.description}"

The page is on a website. Create a professional, well-structured layout with appropriate blocks.
Return ONLY the JSON array, no other text.`;

  try {
    const response = await callAiProvider({
      provider: settings.aiProvider,
      apiKey: settings.aiApiKey,
      model: settings.aiModel,
      baseUrl: settings.aiBaseUrl,
      systemPrompt,
      userPrompt,
      maxTokens: 4096,
      temperature: 0.7,
    });

    const parsed_blocks = extractJsonObject(response);
    if (!parsed_blocks || !Array.isArray(parsed_blocks)) {
      return { success: false, message: "AI returned an invalid layout. Please try again." };
    }

    const blocks = parsed_blocks as Array<{ type?: string; title?: string; config?: Record<string, unknown> }>;

    // Validate blocks
    const validTypes = new Set(BLOCK_TYPES.map((bt) => bt.type));
    const validBlocks = blocks.filter(
      (b) => b.type && validTypes.has(b.type) && typeof b.config === "object"
    );

    if (validBlocks.length === 0) {
      return { success: false, message: "AI generated no valid blocks. Please try with a different description." };
    }

    return {
      success: true,
      message: `Generated ${validBlocks.length} blocks.`,
      blocks: validBlocks.map((b) => ({
        type: b.type!,
        title: b.title,
        config: b.config!,
      })),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "AI generation failed.",
    };
  }
}

export async function applyGeneratedBlocks(
  pageId: number,
  blocks: Array<{ type: string; config: Record<string, unknown>; title?: string }>
): Promise<{ success: boolean; message: string }> {
  const page = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
  if (page.length === 0) return { success: false, message: "Page not found." };

  const siteId = page[0].siteId;
  const access = await requireSiteAccess(siteId);
  if (!hasMinRole((access.role as Role) ?? "viewer", "editor")) return { success: false, message: "Access denied." };
  await requireTenantFeature(siteId, "ai_block_assistant", { role: access.role as Role, userId: access.id });

  // Get current max sort order
  const existing = await db
    .select({ sortOrder: pageBlocks.sortOrder })
    .from(pageBlocks)
    .where(eq(pageBlocks.pageId, pageId))
    .orderBy(desc(pageBlocks.sortOrder))
    .limit(1);

  let nextSort = existing.length > 0 ? existing[0].sortOrder + 1 : 0;

  // Insert blocks in a transaction
  await db.transaction(async (tx) => {
    for (const block of blocks) {
      await tx.insert(pageBlocks).values({
        pageId,
        type: block.type,
        title: block.title,
        config: JSON.stringify(block.config),
        sortOrder: nextSort++,
        visible: true,
      });
    }
  });

  revalidatePath(`/admin/pages/${pageId}/editor`);
  return { success: true, message: `Added ${blocks.length} blocks to the page.` };
}
