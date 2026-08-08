"use server";

import { z } from "zod";
import { hasMinRole, type Role } from "@/lib/auth";
import { getAllServerSettings } from "@/lib/data";
import { getBlockType, getDefaultConfig } from "@/lib/blocks";
import { validateBlockConfig } from "@/lib/block-config-validation";
import { requirePageAccess, requirePageBlockAccess, requireSiteAccess } from "@/lib/tenant-access";
import { requireTenantFeature } from "@/lib/tenant-features";
import { callAiProvider } from "@/lib/ai-provider";

export type GenerateBlockConfigResult = { config: string } | { error: string };

export async function generateBlockConfig(blockId: number, instruction: string, currentConfig: string | null): Promise<GenerateBlockConfigResult> {
  try {
    return { config: await generateBlockConfigOrThrow(blockId, instruction, currentConfig) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to generate block content." };
  }
}

async function generateBlockConfigOrThrow(blockId: number, instruction: string, currentConfig: string | null): Promise<string> {
  if (!Number.isInteger(blockId) || blockId < 1) throw new Error("Invalid block.");
  const block = await requirePageBlockAccess(blockId);
  const page = await requirePageAccess(block.pageId);
  const user = await requireSiteAccess(page.siteId);
  if (!hasMinRole((user.role as Role) ?? "viewer", "editor")) throw new Error("Forbidden");
  await requireTenantFeature(page.siteId, "ai_block_assistant", { role: user.role as Role, userId: user.id });

  const blockType = getBlockType(block.type);
  if (!blockType) throw new Error("This block type is not supported by AI.");
  const request = z.string().trim().min(3, "Enter an instruction for AI.").max(800).parse(instruction);
  const baseConfig = validateBlockConfig(block.type, currentConfig) ?? JSON.stringify(getDefaultConfig(block.type));
  const settings = await getAllServerSettings(page.siteId);
  if (!settings.aiApiKey) throw new Error("Configure an AI API key in Settings → Integrations first.");

  const content = await callAiProvider({
    provider: settings.aiProvider,
    apiKey: settings.aiApiKey,
    model: settings.aiModel,
    baseUrl: settings.aiBaseUrl,
    systemPrompt: `You edit one website-builder block configuration.
Return only a valid JSON object, without markdown.
Keep the configuration compatible with the "${block.type}" block (${blockType.label}).
Preserve useful existing values unless the instruction requests a change.
Do not invent image URLs, emails, phone numbers, addresses, prices, or external links. Use empty strings for unknown values.
The returned JSON must keep compatible field types with this default config: ${JSON.stringify(getDefaultConfig(block.type))}`,
    userPrompt: `Current block config: ${baseConfig}\n\nInstruction: ${request}`,
    jsonMode: true,
  });

  const generated = extractJsonObject(content);
  return validateBlockConfig(block.type, JSON.stringify(generated)) ?? JSON.stringify(getDefaultConfig(block.type));
}

function extractJsonObject(content: string): unknown {
  try { return JSON.parse(content); } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) throw new Error("AI did not return a JSON object.");
    return JSON.parse(content.slice(start, end + 1));
  }
}
