"use server";

import { z } from "zod";
import { hasMinRole, type Role } from "@/lib/auth";
import { db } from "@/lib/db";
import { pageBlocks, pages } from "@/lib/db/schema";
import { getAllServerSettings } from "@/lib/data";
import { requirePageAccess, requireSiteAccess } from "@/lib/tenant-access";
import { requireTenantFeature } from "@/lib/tenant-features";
import { eq, asc } from "drizzle-orm";

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

async function callAiProvider({
  provider,
  apiKey,
  model,
  baseUrl,
  systemPrompt,
  userPrompt,
}: {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  systemPrompt: string;
  userPrompt: string;
}) {
  if (provider === "anthropic") {
    const res = await fetch(`${baseUrl || "https://api.anthropic.com"}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-20250514",
        max_tokens: 600,
        temperature: 0.5,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) throw new Error("AI provider error");
    const data = await res.json();
    return String(data.content?.[0]?.text ?? "");
  }
  if (provider === "google") {
    const res = await fetch(
      `${baseUrl || "https://generativelanguage.googleapis.com/v1beta"}/models/${model || "gemini-2.0-flash"}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { maxOutputTokens: 600, temperature: 0.5 },
        }),
      }
    );
    if (!res.ok) throw new Error("AI provider error");
    const data = await res.json();
    return String(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
  }

  const res = await fetch(`${baseUrl || "https://api.openai.com/v1"}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      max_tokens: 600,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error("AI provider error");
  const data = await res.json();
  return String(data.choices?.[0]?.message?.content ?? "");
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
