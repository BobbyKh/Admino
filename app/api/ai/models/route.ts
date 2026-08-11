import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { validateAiBaseUrl } from "@/lib/ai-provider";

interface ModelInfo {
  id: string;
  name: string;
  ownedBy?: string;
  created?: number;
  contextWindow?: number;
  maxOutputTokens?: number;
  description?: string;
  capabilities?: string[];
}

async function fetchOpenAIModels(apiKey: string, baseUrl: string): Promise<ModelInfo[]> {
  const res = await fetch((baseUrl || "https://api.openai.com/v1") + "/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`OpenAI-compatible: ${res.status}`);
  const data = await res.json();
  return (data.data || [])
    .map((m: Record<string, unknown>) => ({
      id: m.id as string,
      name: m.id as string,
      ownedBy: (m.owned_by as string) || undefined,
      created: (m.created as number) || undefined,
      contextWindow: (m.context_length as number) || (m.context_window as number) || undefined,
      maxOutputTokens: (m.max_tokens as number) || (m.max_output_tokens as number) || undefined,
      description: (m.description as string) || undefined,
      capabilities: Array.isArray(m.capabilities) ? (m.capabilities as string[]) : undefined,
    }))
    .sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));
}

async function fetchAnthropicModels(apiKey: string, baseUrl: string): Promise<ModelInfo[]> {
  const res = await fetch((baseUrl || "https://api.anthropic.com") + "/v1/models", {
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
  });
  if (!res.ok) throw new Error(`Anthropic: ${res.status}`);
  const data = await res.json();
  return (data.data || []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    name: (m.display_name as string) || (m.id as string),
    ownedBy: "anthropic",
    contextWindow: (m.context_window as number) || undefined,
    maxOutputTokens: (m.max_output_tokens as number) || undefined,
    description: (m.description as string) || undefined,
  }));
}

async function fetchGoogleModels(apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  if (!res.ok) throw new Error(`Google: ${res.status}`);
  const data = await res.json();
  return (data.models || [])
    .filter((m: Record<string, unknown>) =>
      (m.supportedGenerationMethods as string[])?.includes("generateContent")
    )
    .map((m: Record<string, unknown>) => ({
      id: (m.name as string).replace("models/", ""),
      name: (m.displayName as string) || (m.name as string).replace("models/", ""),
      ownedBy: "google",
      contextWindow: (m.inputTokenLimit as number) || undefined,
      maxOutputTokens: (m.outputTokenLimit as number) || undefined,
      description: (m.description as string) || undefined,
    }));
}

export async function POST(req: NextRequest) {
  try {
    if (!(await getSessionUser())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { provider, apiKey, baseUrl } = (await req.json()) as {
      provider: string;
      apiKey: string;
      baseUrl?: string;
    };
    if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 400 });
    let safeBaseUrl = "";
    try {
      safeBaseUrl = validateAiBaseUrl(baseUrl);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid base URL" }, { status: 400 });
    }

    let models: ModelInfo[];
    switch (provider) {
      case "anthropic":
        models = await fetchAnthropicModels(apiKey, safeBaseUrl);
        break;
      case "google":
        models = await fetchGoogleModels(apiKey);
        break;
      default:
        models = await fetchOpenAIModels(apiKey, safeBaseUrl);
        break;
    }
    return NextResponse.json({ models });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch models";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
