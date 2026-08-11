"use server";

import { z } from "zod";
import { getAllServerSettings } from "@/lib/data";
import { requireSiteAccess } from "@/lib/tenant-access";
import { validateAiBaseUrl } from "@/lib/ai-provider";

const generateImageSchema = z.object({
  siteId: z.number().int().positive(),
  prompt: z.string().trim().min(3).max(1000),
  size: z.enum(["1024x1024", "1792x1024", "1024x1792"]).default("1024x1024"),
  quality: z.enum(["standard", "hd"]).default("standard"),
});

export type GenerateImageResult =
  | { success: true; url: string; revisedPrompt?: string }
  | { success: false; message: string };

export async function generateImage(
  siteId: number,
  prompt: string,
  size: "1024x1024" | "1792x1024" | "1024x1792" = "1024x1024",
  quality: "standard" | "hd" = "standard"
): Promise<GenerateImageResult> {
  const parsed = generateImageSchema.safeParse({ siteId, prompt, size, quality });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid image request." };
  const access = await requireSiteAccess(parsed.data.siteId);
  if (!access) return { success: false, message: "Access denied." };

  const settings = await getAllServerSettings(parsed.data.siteId);

  if (!settings.aiApiKey) {
    return { success: false, message: "AI is not configured. Add an API key in Settings → AI." };
  }

  // Only OpenAI supports DALL-E image generation
  if (settings.aiProvider !== "openai" && !settings.aiBaseUrl?.includes("openai")) {
    return {
      success: false,
      message: "Image generation requires OpenAI as the AI provider.",
    };
  }

  try {
    const baseUrl = validateAiBaseUrl(settings.aiBaseUrl) || "https://api.openai.com/v1";
    const res = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.aiApiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: parsed.data.prompt,
        n: 1,
        size: parsed.data.size,
        quality: parsed.data.quality,
        response_format: "url",
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      if (err.includes("content_policy")) {
        return { success: false, message: "Image was rejected by content policy. Try a different prompt." };
      }
      return { success: false, message: `Image generation failed: ${res.status}` };
    }

    const data = await res.json() as {
      data?: Array<{ url?: string; revised_prompt?: string }>;
    };

    const image = data.data?.[0];
    if (!image?.url) {
      return { success: false, message: "No image was generated." };
    }

    return {
      success: true,
      url: image.url,
      revisedPrompt: image.revised_prompt,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Image generation failed.",
    };
  }
}

export async function generateImageForUpload(
  _prev: unknown,
  formData: FormData
): Promise<GenerateImageResult> {
  const siteId = Number(formData.get("siteId"));
  const prompt = String(formData.get("prompt") ?? "");
  const size = (formData.get("size") as "1024x1024" | "1792x1024" | "1024x1792") || "1024x1024";
  const quality = (formData.get("quality") as "standard" | "hd") || "standard";

  const parsed = generateImageSchema.safeParse({ siteId, prompt, size, quality });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid image request." };
  return generateImage(parsed.data.siteId, parsed.data.prompt, parsed.data.size, parsed.data.quality);
}
