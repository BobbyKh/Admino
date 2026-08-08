import "server-only";

import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiChunks } from "@/lib/db/schema";
import { getEmbeddings, cosineSimilarity, lexicalEmbedding } from "@/lib/ai-embeddings";
import { getAllServerSettings } from "@/lib/data";

export interface RetrievedChunk {
  title: string;
  content: string;
  path: string | null;
  score: number;
}

/**
 * Retrieve the top-k most relevant site content chunks for a query.
 * Uses embeddings when available (OpenAI-compatible), lexical otherwise.
 */
export async function retrieveSiteContext(
  siteId: number,
  query: string,
  topK = 6
): Promise<RetrievedChunk[]> {
  const settings = await getAllServerSettings(siteId);
  const chunks = await db
    .select({
      id: aiChunks.id,
      title: aiChunks.title,
      content: aiChunks.content,
      path: aiChunks.path,
      embedding: aiChunks.embedding,
    })
    .from(aiChunks)
    .where(eq(aiChunks.siteId, siteId))
    .orderBy(desc(aiChunks.id))
    .limit(500);

  if (chunks.length === 0) return [];

  const useEmbeddings = chunks.some((c) => c.embedding && c.embedding.length > 2);
  if (useEmbeddings) {
    const [queryEmbedding] = await getEmbeddings(
      settings.aiApiKey ?? "",
      settings.aiBaseUrl ?? "",
      settings.aiModel ?? "gpt-4o-mini",
      settings.aiProvider ?? "openai",
      [query]
    );
    const scored = chunks
      .map((c) => {
        let stored: number[] = [];
        try {
          stored = JSON.parse(c.embedding ?? "[]") as number[];
        } catch {
          stored = [];
        }
        return {
          title: c.title,
          content: c.content,
          path: c.path,
          score: stored.length ? cosineSimilarity(queryEmbedding, stored) : 0,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    return scored;
  }

  // Lexical fallback: score by token overlap with the query.
  const queryTokens = new Set(
    query.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length > 2)
  );
  if (queryTokens.size === 0) {
    return chunks.slice(0, topK).map((c) => ({ title: c.title, content: c.content, path: c.path, score: 0 }));
  }
  const qVec = lexicalEmbedding(query);
  const scored = chunks
    .map((c) => {
      const cVec = lexicalEmbedding(`${c.title} ${c.content}`);
      let overlap = 0;
      const contentLower = `${c.title} ${c.content}`.toLowerCase();
      for (const t of queryTokens) if (contentLower.includes(t)) overlap += 1;
      const score = cosineSimilarity(qVec, cVec) * 0.6 + (overlap / queryTokens.size) * 0.4;
      return { title: c.title, content: c.content, path: c.path, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  return scored;
}

/** Build a context block for the chat system prompt from retrieved chunks. */
export function formatRetrievedContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";
  return (
    "RELEVANT SITE CONTENT (answer using this where possible):\n" +
    chunks
      .map(
        (c, i) =>
          `[${i + 1}] ${c.title}${c.path ? ` (${c.path})` : ""}\n${c.content.slice(0, 1500)}`
      )
      .join("\n\n")
  );
}
