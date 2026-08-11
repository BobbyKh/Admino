"use server";

import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiChunks, pages, pageBlocks, products, blogPosts, services, settings as settingsTable } from "@/lib/db/schema";
import { getCurrentSiteRequiringFeature, requireSiteAccess } from "@/lib/tenant-access";
import { hasMinRole, type Role } from "@/lib/auth";
import { getAllServerSettings } from "@/lib/data";
import { getEmbeddings } from "@/lib/ai-embeddings";

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 120;

interface RawChunk {
  sourceType: string;
  sourceId: number | null;
  title: string;
  path: string | null;
  content: string;
}

function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= chunkSize) return cleaned ? [cleaned] : [];
  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    chunks.push(cleaned.slice(start, start + chunkSize));
    start += chunkSize - overlap;
  }
  return chunks;
}

function extractConfigText(config: string | null): string {
  if (!config) return "";
  try {
    const obj = JSON.parse(config) as Record<string, unknown>;
    const parts: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === "string") parts.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach(walk);
    };
    walk(obj);
    return parts.join(" ").trim();
  } catch {
    return (config ?? "").replace(/[{}"]/g, " ").slice(0, 2000);
  }
}

export type ReindexResult =
  | { success: true; message: string; chunks: number }
  | { success: false; error: string };

export async function reindexAiContent(): Promise<ReindexResult> {
  try {
    const siteId = await getCurrentSiteRequiringFeature("ai_chatbot_rag");
    const user = await requireSiteAccess(siteId);
    if (!hasMinRole((user.role as Role) ?? "viewer", "editor")) {
      return { success: false, error: "Permission denied." };
    }

    const raw: RawChunk[] = [];

    const [pageRows, productRows, blogRows, serviceRows] = await Promise.all([
      db.select().from(pages).where(eq(pages.siteId, siteId)),
      db.select().from(products).where(eq(products.siteId, siteId)),
      db.select().from(blogPosts).where(eq(blogPosts.siteId, siteId)),
      db.select().from(services).where(eq(services.siteId, siteId)),
    ]);

    for (const page of pageRows) {
      const blocks = await db.select().from(pageBlocks).where(eq(pageBlocks.pageId, page.id));
      const blockTexts = blocks
        .filter((b) => b.visible)
        .map((b) => `Block (${b.type}): ${b.title ?? ""} ${extractConfigText(b.config)}`)
        .join("\n");
      raw.push({
        sourceType: "page",
        sourceId: page.id,
        title: page.title,
        path: `/${page.slug}`,
        content: [page.description, page.metaDescription, blockTexts].filter(Boolean).join("\n"),
      });
    }

    for (const product of productRows) {
      raw.push({
        sourceType: "product",
        sourceId: product.id,
        title: product.title,
        path: `/products/${product.slug}`,
        content: [
          product.category,
          product.description,
          `Price: ${product.price / 100} ${product.currency || "usd"}`,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    }

    for (const post of blogRows) {
      const html = (post.content ?? "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");
      raw.push({
        sourceType: "blog",
        sourceId: post.id,
        title: post.title,
        path: `/blog/${post.slug}`,
        content: [post.excerpt, html].filter(Boolean).join("\n"),
      });
    }

    for (const service of serviceRows) {
      raw.push({
        sourceType: "service",
        sourceId: service.id,
        title: service.title,
        path: null,
        content: [service.description].filter(Boolean).join("\n"),
      });
    }

    const flat: RawChunk[] = [];
    for (const r of raw) {
      for (const piece of chunkText(r.content)) {
        flat.push({ ...r, content: piece });
      }
    }

    if (flat.length === 0) {
      return { success: false, error: "No content found to index." };
    }

    const settings = await getAllServerSettings(siteId);
    const embeddings = await getEmbeddings(
      settings.aiApiKey ?? "",
      settings.aiBaseUrl ?? "",
      settings.aiModel ?? "gpt-4o-mini",
      settings.aiProvider ?? "openai",
      flat.map((c) => `${c.title}\n${c.content}`)
    );

    await db.delete(aiChunks).where(eq(aiChunks.siteId, siteId));
    await db.insert(aiChunks).values(
      flat.map((c, i) => ({
        siteId,
        sourceType: c.sourceType,
        sourceId: c.sourceId,
        title: c.title,
        content: c.content,
        path: c.path,
        embedding: JSON.stringify(embeddings[i] ?? []),
      }))
    );

    // Record the index timestamp for the public settings payload.
    await db
      .insert(settingsTable)
      .values({ key: "aiRagIndexedAt", siteId, value: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({
        target: [settingsTable.key, settingsTable.siteId],
        set: { value: new Date().toISOString(), updatedAt: new Date().toISOString() },
      });

    return { success: true, message: `Indexed ${flat.length} chunks from your site content.`, chunks: flat.length };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Indexing failed.",
    };
  }
}

export async function getAiIndexStats(): Promise<
  { success: true; chunks: number; indexedAt: string | null } | { success: false; error: string }
> {
  try {
    const siteId = await getCurrentSiteRequiringFeature("ai_chatbot_rag");
    const rows = await db
      .select({ chunks: sql<number>`count(${aiChunks.id})::int` })
      .from(aiChunks)
      .where(eq(aiChunks.siteId, siteId));
    const settings = await getAllServerSettings(siteId);
    return {
      success: true,
      chunks: rows[0]?.chunks ?? 0,
      indexedAt: settings.aiRagIndexedAt || null,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to read index stats.",
    };
  }
}

