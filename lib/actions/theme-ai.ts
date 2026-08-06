"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { getCurrentAdminSiteId } from "@/lib/tenant-access";
import { getAllServerSettings } from "@/lib/data";

const THEME_KEYS = [
  "themePrimary",
  "themePrimaryForeground",
  "themeSecondary",
  "themeSecondaryForeground",
  "themeAccent",
  "themeAccentForeground",
  "themeBackground",
  "themeForeground",
  "themeMuted",
  "themeMutedForeground",
  "themeBorder",
  "themeRing",
  "themeDestructive",
  "themeCard",
  "themeCardForeground",
] as const;

export type AiGeneratedTheme = {
  name: string;
  colors: Record<(typeof THEME_KEYS)[number], string>;
  rationale?: string;
};

const colorSchema = z.string().trim().min(1).max(80).refine(isSafeCssColor, "Invalid CSS color.");

const generatedThemeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  rationale: z.string().trim().max(240).optional(),
  themePrimary: colorSchema,
  themePrimaryForeground: colorSchema,
  themeSecondary: colorSchema,
  themeSecondaryForeground: colorSchema,
  themeAccent: colorSchema,
  themeAccentForeground: colorSchema,
  themeBackground: colorSchema,
  themeForeground: colorSchema,
  themeMuted: colorSchema,
  themeMutedForeground: colorSchema,
  themeBorder: colorSchema,
  themeRing: colorSchema,
  themeDestructive: colorSchema,
  themeCard: colorSchema,
  themeCardForeground: colorSchema,
});

export async function generateThemeFromPrompt(prompt: string): Promise<AiGeneratedTheme> {
  await requireRole("admin");
  const siteId = await getCurrentAdminSiteId();
  const settings = await getAllServerSettings(siteId);
  const input = z.string().trim().min(8, "Describe the theme in a little more detail.").max(800).parse(prompt);

  if (!settings.aiApiKey) {
    throw new Error("Configure an AI API key in Settings → Integrations before generating themes.");
  }

  const systemPrompt = `You generate accessible website theme color tokens for a multi-tenant web builder.
Return only valid JSON. Do not wrap it in markdown.
All colors must be CSS color values, preferably oklch().
Ensure readable foreground/background contrast.
Required keys: name, rationale, ${THEME_KEYS.join(", ")}.`;
  const userPrompt = `Generate a complete theme for this request: ${input}`;

  const content = await callConfiguredAi({
    provider: settings.aiProvider,
    apiKey: settings.aiApiKey,
    model: settings.aiModel,
    baseUrl: settings.aiBaseUrl,
    systemPrompt,
    userPrompt,
  });

  const parsedJson = extractJsonObject(content);
  const parsed = generatedThemeSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "AI returned an invalid theme.");
  }

  return {
    name: parsed.data.name,
    rationale: parsed.data.rationale,
    colors: Object.fromEntries(THEME_KEYS.map((key) => [key, parsed.data[key]])) as AiGeneratedTheme["colors"],
  };
}

async function callConfiguredAi({
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
        max_tokens: 1200,
        temperature: 0.6,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) throw new Error(`Theme generation failed: ${res.status}`);
    const data = await res.json();
    return String(data.content?.[0]?.text ?? "");
  }

  if (provider === "google") {
    const res = await fetch(`${baseUrl || "https://generativelanguage.googleapis.com/v1beta"}/models/${model || "gemini-2.0-flash"}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 1200, temperature: 0.6 },
      }),
    });
    if (!res.ok) throw new Error(`Theme generation failed: ${res.status}`);
    const data = await res.json();
    return String(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
  }

  const res = await fetch(`${baseUrl || "https://api.openai.com/v1"}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      max_tokens: 1200,
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Theme generation failed: ${res.status}`);
  const data = await res.json();
  return String(data.choices?.[0]?.message?.content ?? "");
}

function extractJsonObject(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) throw new Error("AI did not return JSON.");
    return JSON.parse(content.slice(start, end + 1));
  }
}

function isSafeCssColor(value: string) {
  const trimmed = value.trim();
  if (!/^[#a-zA-Z0-9\s.,%()+/-]+$/.test(trimmed)) return false;
  if (/url|expression|import|javascript/i.test(trimmed)) return false;
  return /^(#[0-9a-f]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|oklch\(|oklab\(|lab\(|lch\(|[a-z]+$)/i.test(trimmed);
}
