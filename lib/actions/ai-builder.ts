"use server";

import { z } from "zod";
import { eq, asc, desc, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages, pageBlocks, products, blogPosts } from "@/lib/db/schema";
import { requireSiteFeatureForRole } from "@/lib/tenant-access";
import { getAllServerSettings } from "@/lib/data";
import { callAiProvider } from "@/lib/ai-provider";
import { BLOCK_TYPES } from "@/lib/blocks";
import { validateBlockConfig, validateBlockType } from "@/lib/block-config-validation";
import { revalidatePath } from "next/cache";

export interface BuilderMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BuilderActionResult {
  id: number;
  type: string;
  detail: string;
}

export type AiSiteBuilderResult =
  | {
      success: true;
      reply: string;
      actions: BuilderActionResult[];
    }
  | { success: false; error: string };

const stepSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("create_page"),
    title: z.string().min(1).max(200),
    slug: z.string().min(1).max(200),
    published: z.boolean().optional(),
    description: z.string().max(500).optional(),
    metaTitle: z.string().max(200).optional(),
    metaDescription: z.string().max(300).optional(),
  }),
  z.object({
    op: z.literal("update_page"),
    pageId: z.number().int().positive(),
    title: z.string().min(1).max(200).optional(),
    slug: z.string().min(1).max(200).optional(),
    published: z.boolean().optional(),
    description: z.string().max(500).optional(),
    metaTitle: z.string().max(200).optional(),
    metaDescription: z.string().max(300).optional(),
  }),
  z.object({
    op: z.literal("delete_page"),
    pageId: z.number().int().positive(),
  }),
  z.object({
    op: z.literal("add_block"),
    pageId: z.number().int().positive(),
    type: z.string().min(1),
    title: z.string().max(200).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    op: z.literal("update_block"),
    blockId: z.number().int().positive(),
    title: z.string().max(200).optional(),
    visible: z.boolean().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    op: z.literal("delete_block"),
    blockId: z.number().int().positive(),
  }),
  z.object({
    op: z.literal("create_product"),
    title: z.string().min(1).max(200),
    slug: z.string().min(1).max(200),
    price: z.number().int().min(0),
    description: z.string().max(2000).optional(),
    category: z.string().max(100).optional(),
    image: z.string().max(1000).optional(),
    inventoryQuantity: z.number().int().min(0).optional(),
  }),
  z.object({
    op: z.literal("update_product"),
    productId: z.number().int().positive(),
    title: z.string().min(1).max(200).optional(),
    price: z.number().int().min(0).optional(),
    description: z.string().max(2000).optional(),
    category: z.string().max(100).optional(),
    image: z.string().max(1000).optional(),
  }),
]);

type Step = z.infer<typeof stepSchema>;

function buildBlockTypeReference(): string {
  return BLOCK_TYPES.map((bt) => {
    const keys = Object.keys(bt.defaultConfig);
    return `- "${bt.type}": ${bt.label}. Config fields: ${keys.join(", ")}`;
  }).join("\n");
}

async function buildSiteSnapshot(siteId: number): Promise<string> {
  const [pageRows, productRows, blogRows] = await Promise.all([
    db
      .select({ id: pages.id, title: pages.title, slug: pages.slug, published: pages.published })
      .from(pages)
      .where(eq(pages.siteId, siteId))
      .orderBy(asc(pages.sortOrder)),
    db
      .select({ id: products.id, title: products.title, slug: products.slug, price: products.price, status: products.status })
      .from(products)
      .where(eq(products.siteId, siteId)),
    db
      .select({ id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug })
      .from(blogPosts)
      .where(eq(blogPosts.siteId, siteId)),
  ]);

  const pageDetails = await Promise.all(
    pageRows.map(async (p) => {
      const blocks = await db
        .select({ id: pageBlocks.id, type: pageBlocks.type, title: pageBlocks.title, visible: pageBlocks.visible })
        .from(pageBlocks)
        .where(eq(pageBlocks.pageId, p.id))
        .orderBy(asc(pageBlocks.sortOrder));
      const blockList = blocks.map((b) => `  - block#${b.id} type=${b.type} title=${b.title ?? "untitled"}`).join("\n");
      return `- page#${p.id} "${p.title}" slug=/${p.slug} published=${p.published ? "yes" : "no"}\n${blockList || "  (no blocks)"}`;
    })
  );

  return [
    "CURRENT SITE STATE:",
    "PAGES:",
    pageDetails.length ? pageDetails.join("\n") : "  (none yet)",
    "PRODUCTS:",
    productRows.length
      ? productRows.map((p) => `- product#${p.id} "${p.title}" slug=${p.slug} price=${p.price} status=${p.status}`).join("\n")
      : "  (none)",
    "BLOG POSTS:",
    blogRows.length
      ? blogRows.map((b) => `- blog#${b.id} "${b.title}" slug=${b.slug}`).join("\n")
      : "  (none)",
  ].join("\n");
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
  }
  return null;
}

async function executeStep(
  siteId: number,
  user: { id: number; role: string },
  step: Step
): Promise<BuilderActionResult> {
  switch (step.op) {
    case "create_page": {
      const [existing] = await db
        .select()
        .from(pages)
        .where(and(eq(pages.siteId, siteId), eq(pages.slug, step.slug)))
        .limit(1);
      let sort = 0;
      const maxOrder = await db.select({ s: pages.sortOrder }).from(pages).where(eq(pages.siteId, siteId)).orderBy(desc(pages.sortOrder)).limit(1);
      if (maxOrder.length) sort = maxOrder[0].s + 1;
      if (existing) throw new Error(`Slug "/${step.slug}" is already taken.`);
      const [row] = await db
        .insert(pages)
        .values({
          siteId,
          title: step.title,
          slug: step.slug,
          published: step.published ?? false,
          description: step.description ?? null,
          metaTitle: step.metaTitle ?? null,
          metaDescription: step.metaDescription ?? null,
          sortOrder: sort,
          template: "default",
        })
        .returning();
      revalidatePath("/");
      return { id: row.id, type: "page", detail: `Created page "${step.title}" (/${step.slug})` };
    }
    case "update_page": {
      const [page] = await db.select().from(pages).where(eq(pages.id, step.pageId));
      if (!page || page.siteId !== siteId) throw new Error("Page not found.");
      const [row] = await db
        .update(pages)
        .set({
          title: step.title ?? page.title,
          slug: step.slug ?? page.slug,
          published: step.published ?? page.published,
          description: step.description ?? page.description,
          metaTitle: step.metaTitle ?? page.metaTitle,
          metaDescription: step.metaDescription ?? page.metaDescription,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pages.id, step.pageId))
        .returning();
      revalidatePath("/");
      return { id: row.id, type: "page", detail: `Updated page "${row.title}"` };
    }
    case "delete_page": {
      const [page] = await db.select().from(pages).where(eq(pages.id, step.pageId));
      if (!page || page.siteId !== siteId) throw new Error("Page not found.");
      if (page.slug === "home") throw new Error("Cannot delete the home page.");
      await db.delete(pages).where(eq(pages.id, step.pageId));
      revalidatePath("/");
      return { id: step.pageId, type: "page", detail: `Deleted page "${page.title}"` };
    }
    case "add_block": {
      const [page] = await db.select().from(pages).where(eq(pages.id, step.pageId));
      if (!page || page.siteId !== siteId) throw new Error("Page not found.");
      validateBlockType(step.type);
      const defaultConfig = BLOCK_TYPES.find((b) => b.type === step.type)?.defaultConfig ?? {};
      const config = { ...defaultConfig, ...(step.config ?? {}) };
      const validated = validateBlockConfig(step.type, JSON.stringify(config));
      let sort = 0;
      const maxOrder = await db.select({ s: pageBlocks.sortOrder }).from(pageBlocks).where(eq(pageBlocks.pageId, step.pageId)).orderBy(desc(pageBlocks.sortOrder)).limit(1);
      if (maxOrder.length) sort = maxOrder[0].s + 1;
      const [row] = await db
        .insert(pageBlocks)
        .values({
          pageId: step.pageId,
          type: step.type,
          title: step.title ?? null,
          config: validated ?? JSON.stringify(defaultConfig),
          sortOrder: sort,
          visible: true,
        })
        .returning();
      revalidatePath("/");
      return { id: row.id, type: "block", detail: `Added ${step.type} block to "${page.title}"` };
    }
    case "update_block": {
      const [block] = await db.select().from(pageBlocks).where(eq(pageBlocks.id, step.blockId));
      if (!block) throw new Error("Block not found.");
      const [page] = await db.select().from(pages).where(eq(pages.id, block.pageId));
      if (!page || page.siteId !== siteId) throw new Error("Block not found.");
      let config: string | null = block.config;
      if (step.config !== undefined) {
        const parsed = step.config;
        config = validateBlockConfig(block.type, JSON.stringify(parsed));
      }
      const [row] = await db
        .update(pageBlocks)
        .set({
          title: step.title ?? block.title,
          visible: step.visible ?? block.visible,
          config,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pageBlocks.id, step.blockId))
        .returning();
      revalidatePath("/");
      return { id: row.id, type: "block", detail: `Updated block#${row.id} (${block.type})` };
    }
    case "delete_block": {
      const [block] = await db.select().from(pageBlocks).where(eq(pageBlocks.id, step.blockId));
      if (!block) throw new Error("Block not found.");
      const [page] = await db.select().from(pages).where(eq(pages.id, block.pageId));
      if (!page || page.siteId !== siteId) throw new Error("Block not found.");
      await db.delete(pageBlocks).where(eq(pageBlocks.id, step.blockId));
      revalidatePath("/");
      return { id: step.blockId, type: "block", detail: `Deleted block#${step.blockId} (${block.type})` };
    }
    case "create_product": {
      const [existing] = await db.select().from(products).where(eq(products.slug, step.slug)).limit(1);
      if (existing) throw new Error(`Product slug "${step.slug}" is already taken.`);
      const [row] = await db
        .insert(products)
        .values({
          siteId,
          title: step.title,
          slug: step.slug,
          price: step.price,
          description: step.description ?? null,
          category: step.category ?? null,
          image: step.image ?? null,
          inventoryQuantity: step.inventoryQuantity ?? 0,
          status: "draft",
          currency: "usd",
        })
        .returning();
      revalidatePath("/");
      return { id: row.id, type: "product", detail: `Created product "${step.title}"` };
    }
    case "update_product": {
      const [product] = await db.select().from(products).where(eq(products.id, step.productId));
      if (!product || product.siteId !== siteId) throw new Error("Product not found.");
      const [row] = await db
        .update(products)
        .set({
          title: step.title ?? product.title,
          price: step.price ?? product.price,
          description: step.description ?? product.description,
          category: step.category ?? product.category,
          image: step.image ?? product.image,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(products.id, step.productId))
        .returning();
      revalidatePath("/");
      return { id: row.id, type: "product", detail: `Updated product "${row.title}"` };
    }
  }
}

export async function runAiSiteBuilder(
  siteId: number,
  messages: BuilderMessage[]
): Promise<AiSiteBuilderResult> {
  try {
    const user = await requireSiteFeatureForRole(siteId, "ai_site_builder", "editor");
    const settings = await getAllServerSettings(siteId);
    if (!settings.aiApiKey) {
      return { success: false, error: "Configure an AI API key in Settings → AI first." };
    }

    const snapshot = await buildSiteSnapshot(siteId);
    const blockRef = buildBlockTypeReference();

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    if (!lastUserMsg.trim()) {
      return { success: false, error: "Please describe what you want to build or change." };
    }

    const systemPrompt = `You are an expert agentic website builder for Admino CMS. You help site owners create and edit their site by planning concrete database operations.

AVAILABLE BLOCK TYPES (use exactly these type strings):
${blockRef}

Your ONLY job: given the conversation and the CURRENT SITE STATE, decide whether you can act or need clarification.

Return ONLY a JSON object, one of two shapes:

1) If you can act, return an execution plan:
{"op":"plan","steps":[ ... ]}

Each step is one of:
- {"op":"create_page","title":"...","slug":"...","published":false,"description":"...","metaTitle":"...","metaDescription":"..."}
- {"op":"update_page","pageId":<id>,"title":"...","published":true}
- {"op":"delete_page","pageId":<id>}
- {"op":"add_block","pageId":<id>,"type":"<one of the block types above>","title":"...","config":{...}}
- {"op":"update_block","blockId":<id>,"config":{...},"visible":true}
- {"op":"delete_block","blockId":<id>}
- {"op":"create_product","title":"...","slug":"...","price":<integer minor units>,"description":"...","category":"..."}
- {"op":"update_product","productId":<id>,"price":<integer>,"description":"..."}

2) If you need more information, return:
{"op":"ask","question":"<your clarifying question>"}

RULES:
- Refer to existing ids from the CURRENT SITE STATE (page#id, block#id, product#id). Never invent ids.
- For "add_block", the config must ONLY contain fields listed for that block type above. Provide realistic, on-brand content for the site.
- A full page build typically = 1 create_page + several add_block steps (hero first).
- If asked to update content on a block, prefer update_block with the existing block id.
- Prices are in minor units (e.g. $12.50 = 1250).
- Do not include markdown or prose outside the JSON.

CURRENT SITE STATE:
${snapshot}`;

    const userPrompt = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    const raw = await callAiProvider({
      provider: settings.aiProvider,
      apiKey: settings.aiApiKey,
      model: settings.aiModel,
      baseUrl: settings.aiBaseUrl,
      systemPrompt,
      userPrompt,
      maxTokens: 3000,
      temperature: 0.4,
    });

    const parsed = extractJsonObject(raw);
    if (!parsed || typeof parsed.op !== "string") {
      return { success: false, error: "The AI returned an unreadable response. Try again." };
    }

    if (parsed.op === "ask") {
      return {
        success: true,
        reply: String(parsed.question ?? "Could you give me a bit more detail?"),
        actions: [],
      };
    }

    if (parsed.op !== "plan" || !Array.isArray(parsed.steps)) {
      return { success: false, error: "The AI did not return a valid plan. Try rephrasing." };
    }

    const steps: Step[] = [];
    for (const rawStep of parsed.steps) {
      const parsedStep = stepSchema.safeParse(rawStep);
      if (parsedStep.success) {
        steps.push(parsedStep.data);
      }
    }
    if (steps.length === 0) {
      return { success: false, error: "The plan contained no valid operations." };
    }

    const results: BuilderActionResult[] = [];
    const errors: string[] = [];
    for (const step of steps) {
      try {
        results.push(await executeStep(siteId, user, step));
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "Operation failed.");
      }
    }

    const summary = [
      "Changes executed:",
      ...results.map((r) => `- ${r.detail}`),
      ...(errors.length ? ["", "Warnings:", ...errors.map((e) => `- ${e}`)] : []),
    ].join("\n");

    const replyPrompt = `You are a helpful assistant summarizing site changes.
The following operations just ran against a CMS site:
${summary}
Write a friendly, concise summary (max 120 words) of what was changed. Mention anything that failed. Do not mention JSON or steps.`;
    let reply: string;
    try {
      reply = await callAiProvider({
        provider: settings.aiProvider,
        apiKey: settings.aiApiKey,
        model: settings.aiModel,
        baseUrl: settings.aiBaseUrl,
        systemPrompt: replyPrompt,
        userPrompt: summary,
        maxTokens: 300,
        temperature: 0.5,
      });
    } catch {
      reply = results.length
        ? `Done! Applied ${results.length} change${results.length === 1 ? "" : "s"}.`
        : "I wasn't able to make changes.";
    }

    return { success: true, reply, actions: results };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "AI builder failed.",
    };
  }
}
