"use server";

import { z } from "zod";
import { hasMinRole, type Role } from "@/lib/auth";
import { getAllServerSettings } from "@/lib/data";
import { getBlockType, getDefaultConfig } from "@/lib/blocks";
import { validateBlockConfig } from "@/lib/block-config-validation";
import { requirePageAccess, requirePageBlockAccess, requireSiteAccess } from "@/lib/tenant-access";
import { requireTenantFeature } from "@/lib/tenant-features";

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

  const content = await callConfiguredAi({
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
  });

  const generated = extractJsonObject(content);
  return validateBlockConfig(block.type, JSON.stringify(generated)) ?? JSON.stringify(getDefaultConfig(block.type));
}

async function callConfiguredAi({ provider, apiKey, model, baseUrl, systemPrompt, userPrompt }: { provider: string; apiKey: string; model: string; baseUrl: string; systemPrompt: string; userPrompt: string }) {
  if (provider === "anthropic") {
    const res = await fetch(`${baseUrl || "https://api.anthropic.com"}/v1/messages`, { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: model || "claude-sonnet-4-20250514", max_tokens: 1600, temperature: 0.6, system: systemPrompt, messages: [{ role: "user", content: userPrompt }] }) });
    if (!res.ok) throw new Error(await getProviderError(res));
    const data = await res.json();
    return String(data.content?.[0]?.text ?? "");
  }
  if (provider === "google") {
    const res = await fetch(`${baseUrl || "https://generativelanguage.googleapis.com/v1beta"}/models/${model || "gemini-2.0-flash"}:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: "user", parts: [{ text: userPrompt }] }], generationConfig: { maxOutputTokens: 1600, temperature: 0.6 } }) });
    if (!res.ok) throw new Error(await getProviderError(res));
    const data = await res.json();
    return String(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
  }
  const res = await fetch(`${baseUrl || "https://api.openai.com/v1"}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: model || "gpt-4o-mini", max_tokens: 1600, temperature: 0.6, response_format: { type: "json_object" }, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }) });
  if (!res.ok) throw new Error(await getProviderError(res));
  const data = await res.json();
  return String(data.choices?.[0]?.message?.content ?? "");
}

async function getProviderError(response: Response) {
  if (response.status === 401) return "The configured AI API key is invalid.";
  if (response.status === 402) return "The AI provider has no available credit or billing is not enabled. Add credits or select a funded model in Settings → Integrations.";
  if (response.status === 429) return "The AI provider rate limit was reached. Please try again shortly.";
  return `AI generation failed (${response.status}).`;
}

function extractJsonObject(content: string): unknown {
  try { return JSON.parse(content); } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) throw new Error("AI did not return a JSON object.");
    return JSON.parse(content.slice(start, end + 1));
  }
}
