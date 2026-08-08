"use server";

import { z } from "zod";
import { hasMinRole, type Role } from "@/lib/auth";
import { getAllServerSettings } from "@/lib/data";
import { getCurrentAdminSiteId, requireSiteAccess } from "@/lib/tenant-access";
import { requireTenantFeature } from "@/lib/tenant-features";
import { callAiProvider } from "@/lib/ai-provider";

export type GeneratedBlogPost = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
};

export type GenerateBlogResult = { post: GeneratedBlogPost } | { error: string };

/**
 * Drafts a complete blog post title, slug, excerpt, and rich HTML body with AI.
 */
export async function generateBlogPostWithAi(
  topic: string,
  tone: string = "informative"
): Promise<GenerateBlogResult> {
  try {
    const siteId = await getCurrentAdminSiteId();
    if (!siteId) throw new Error("Select a site first.");
    const user = await requireSiteAccess(siteId);
    if (!hasMinRole((user.role as Role) ?? "viewer", "editor")) {
      throw new Error("Forbidden");
    }
    await requireTenantFeature(siteId, "ai_block_assistant", {
      role: user.role as Role,
      userId: user.id,
    });

    const settings = await getAllServerSettings(siteId);
    if (!settings.aiApiKey) {
      throw new Error("Configure an AI API key in Settings → Integrations first.");
    }

    const cleanTopic = z.string().trim().min(3, "Enter a topic.").max(300).parse(topic);

    const systemPrompt = `You are a professional content strategist and blog writer.
Return ONLY a valid JSON object with keys: "title", "slug", "excerpt", and "content".
- "title": Engaging post headline.
- "slug": URL-safe slugified string.
- "excerpt": 1-2 sentence summary.
- "content": Well-formatted HTML article body using <h2>, <p>, <ul>, <li>, and <strong> tags.`;

    const userPrompt = `Topic: "${cleanTopic}"\nTone of voice: ${tone}`;

    const content = await callAiProvider({
      provider: settings.aiProvider,
      apiKey: settings.aiApiKey,
      model: settings.aiModel,
      baseUrl: settings.aiBaseUrl,
      systemPrompt,
      userPrompt,
      maxTokens: 1200,
      temperature: 0.7,
      jsonMode: true,
    });

    const parsed = JSON.parse(content) as Record<string, string>;

    const schema = z.object({
      title: z.string().trim().min(3),
      slug: z.string().trim().min(3),
      excerpt: z.string().trim().min(10),
      content: z.string().trim().min(20),
    });

    return { post: schema.parse(parsed) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to generate blog post." };
  }
}
