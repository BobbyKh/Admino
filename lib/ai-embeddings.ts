/**
 * Embeddings helpers for RAG retrieval over site content.
 * Uses an OpenAI-compatible /embeddings endpoint (OpenAI, custom providers).
 * Falls back to a deterministic lexical hash-embedding when no embedding
 * endpoint is available so retrieval still works offline.
 */

export async function getEmbeddings(
  apiKey: string,
  baseUrl: string,
  model: string,
  provider: string,
  texts: string[]
): Promise<number[][]> {
  if (provider === "anthropic") {
    // Anthropic has no public embeddings endpoint; use fallback.
    return texts.map(lexicalEmbedding);
  }
  if (provider === "google") {
    // Google embeddings require a different API shape; use fallback for now.
    return texts.map(lexicalEmbedding);
  }

  try {
    const url = `${baseUrl || "https://api.openai.com/v1"}/embeddings`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model === "gpt-4o-mini" || model === "gpt-4o" ? "text-embedding-3-small" : model,
        input: texts,
      }),
    });
    if (!res.ok) {
      // Some custom endpoints only support chat; fall back quietly.
      return texts.map(lexicalEmbedding);
    }
    const data = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    if (!data.data || data.data.length === 0) return texts.map(lexicalEmbedding);
    return data.data.map((d) => d.embedding);
  } catch {
    return texts.map(lexicalEmbedding);
  }
}

/** Deterministic, hash-based bag-of-words embedding. 128 dims. */
export function lexicalEmbedding(text: string): number[] {
  const dims = 128;
  const vec = new Array(dims).fill(0) as number[];
  const tokens = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(hash) % dims;
    vec[idx] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
