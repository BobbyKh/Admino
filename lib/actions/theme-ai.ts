"use server";

import { z } from "zod";
import { requireRole, type Role } from "@/lib/auth";
import { getCurrentAdminSiteId } from "@/lib/tenant-access";
import { getAllServerSettings } from "@/lib/data";
import { requireTenantFeature } from "@/lib/tenant-features";
import { callAiProvider } from "@/lib/ai-provider";

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

export type GenerateThemeResult = { theme: AiGeneratedTheme } | { error: string };

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

export async function generateThemeFromPrompt(prompt: string): Promise<GenerateThemeResult> {
  try {
    return { theme: await generateThemeFromPromptOrThrow(prompt) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to generate theme." };
  }
}

async function generateThemeFromPromptOrThrow(prompt: string): Promise<AiGeneratedTheme> {
  const user = await requireRole("admin");
  const siteId = await getCurrentAdminSiteId();
  await requireTenantFeature(siteId, "ai_theme_generator", { role: user.role as Role, userId: user.id });
  const settings = await getAllServerSettings(siteId);
  const input = z.string().trim().min(8, "Describe the theme in a little more detail.").max(800).parse(prompt);

  if (!settings.aiApiKey) {
    throw new Error("Configure an AI API key in Settings → Integrations before generating themes.");
  }

  const systemPrompt = `You generate distinctive, accessible website theme color tokens for a multi-tenant web builder.
Return only valid JSON. Do not wrap it in markdown.
All colors must be CSS color values, preferably oklch().
Ensure readable foreground/background contrast.
Unless the request explicitly asks for monochrome, black and white, grayscale, or neutral-only styling, use a clearly chromatic primary, secondary, and accent palette. Do not return a generic white-and-black theme. The primary and accent must be visibly different hues and should reflect the requested mood or industry.
Required keys: name, rationale, ${THEME_KEYS.join(", ")}.`;
  const userPrompt = `Generate a complete theme for this request: ${input}`;

  const content = await callAiProvider({
    provider: settings.aiProvider,
    apiKey: settings.aiApiKey,
    model: settings.aiModel,
    baseUrl: settings.aiBaseUrl,
    systemPrompt,
    userPrompt,
    maxTokens: 1200,
    jsonMode: true,
  });

  let parsed = parseGeneratedTheme(content);
  if (!allowsMonochrome(input) && isTooNeutral(parsed.data)) {
    const retry = await callAiProvider({
      provider: settings.aiProvider,
      apiKey: settings.aiApiKey,
      model: settings.aiModel,
      baseUrl: settings.aiBaseUrl,
      systemPrompt,
      userPrompt: `${userPrompt}\n\nYour first result was too neutral. Regenerate with a visibly colored primary, secondary, and accent palette. Use different hues for primary and accent.`,
      maxTokens: 1200,
      jsonMode: true,
    });
    parsed = parseGeneratedTheme(retry);
    if (isTooNeutral(parsed.data)) {
      throw new Error("AI returned a neutral palette twice. Try a more specific prompt with colors, such as 'deep navy, warm gold, and teal accents'.");
    }
  }

  return {
    name: parsed.data.name,
    rationale: parsed.data.rationale,
    colors: Object.fromEntries(THEME_KEYS.map((key) => [key, parsed.data[key]])) as AiGeneratedTheme["colors"],
  };
}

function parseGeneratedTheme(content: string) {
  const parsed = generatedThemeSchema.safeParse(extractJsonObject(content));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "AI returned an invalid theme.");
  return parsed;
}

function allowsMonochrome(prompt: string) {
  return /\b(monochrome|black\s*(and|&)\s*white|grayscale|greyscale|neutral-only)\b/i.test(prompt);
}

function isTooNeutral(theme: z.infer<typeof generatedThemeSchema>) {
  const brandColors = [theme.themePrimary, theme.themeSecondary, theme.themeAccent];
  return brandColors.filter(isChromatic).length < 2;
}

function isChromatic(color: string) {
  const oklch = color.match(/^oklch\(\s*[\d.]+\s+([\d.]+)/i);
  if (oklch) return Number(oklch[1]) >= 0.04;

  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const channels = [hex[1].slice(0, 2), hex[1].slice(2, 4), hex[1].slice(4, 6)].map((value) => Number.parseInt(value, 16));
    return Math.max(...channels) - Math.min(...channels) >= 24;
  }

  return /^(rgb|rgba|hsl|hsla|oklab|lab|lch)\(/i.test(color);
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
