"use server";

import { z } from "zod";
import { hasMinRole, type Role } from "@/lib/auth";
import { getAllServerSettings } from "@/lib/data";
import { getCurrentAdminSiteId, requireSiteAccess } from "@/lib/tenant-access";
import { requireTenantFeature } from "@/lib/tenant-features";
import { callAiProvider } from "@/lib/ai-provider";

export type GeneratedProductCopy = {
  description: string;
  badge: string;
};

export type GenerateProductCopyResult = { copy: GeneratedProductCopy } | { error: string };

/**
 * Generates compelling sales descriptions and product badges using AI.
 */
export async function generateProductDescriptionWithAi(
  productName: string,
  keyFeatures?: string
): Promise<GenerateProductCopyResult> {
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

    const cleanName = z.string().trim().min(2, "Enter a product name.").max(120).parse(productName);

    const systemPrompt = `You write high-converting ecommerce sales copy.
Return ONLY a valid JSON object with keys "description" and "badge".
- "description": 2-3 short paragraphs explaining key benefits and features.
- "badge": A 1-2 word promotional badge string (e.g., "Best Seller", "New Arrival", "Top Choice", "Limited Offer").`;

    const userPrompt = `Product: "${cleanName}"\nFeatures/Highlights: ${keyFeatures?.trim() || "Quality craftsmanship and modern design."}`;

    const content = await callAiProvider({
      provider: settings.aiProvider,
      apiKey: settings.aiApiKey,
      model: settings.aiModel,
      baseUrl: settings.aiBaseUrl,
      systemPrompt,
      userPrompt,
    });

    const parsed = JSON.parse(content) as Record<string, string>;

    const schema = z.object({
      description: z.string().trim().min(10),
      badge: z.string().trim().min(2).max(30),
    });

    return { copy: schema.parse(parsed) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to generate product copy." };
  }
}
