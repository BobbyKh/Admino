import { NextRequest, NextResponse } from "next/server";

interface UsageInfo {
  provider: string;
  models?: { id: string; name: string }[];
  billing?: string;
  error?: string;
}

async function fetchOpenAIUsage(apiKey: string): Promise<UsageInfo> {
  // OpenAI doesn't have a simple usage/billing endpoint, but we can check the API key validity
  // and list models to confirm access. For billing, we'd need the dashboard API.
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    if (res.status === 401) return { provider: "openai", error: "Invalid API key" };
    return { provider: "openai", error: `API error: ${res.status}` };
  }
  return {
    provider: "openai",
    billing: "Usage tracked at platform.openai.com/usage",
  };
}

async function fetchAnthropicUsage(apiKey: string): Promise<UsageInfo> {
  const res = await fetch("https://api.anthropic.com/v1/models", {
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
  });
  if (!res.ok) {
    if (res.status === 401) return { provider: "anthropic", error: "Invalid API key" };
    return { provider: "anthropic", error: `API error: ${res.status}` };
  }
  return {
    provider: "anthropic",
    billing: "Usage tracked at console.anthropic.com",
  };
}

async function fetchGoogleUsage(apiKey: string): Promise<UsageInfo> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  if (!res.ok) {
    if (res.status === 400 || res.status === 403) return { provider: "google", error: "Invalid API key" };
    return { provider: "google", error: `API error: ${res.status}` };
  }
  return {
    provider: "google",
    billing: "Usage tracked at aistudio.google.com",
  };
}

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey } = (await req.json()) as {
      provider: string;
      apiKey: string;
    };
    if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 400 });

    let result: UsageInfo;
    switch (provider) {
      case "anthropic":
        result = await fetchAnthropicUsage(apiKey);
        break;
      case "google":
        result = await fetchGoogleUsage(apiKey);
        break;
      default:
        result = await fetchOpenAIUsage(apiKey);
        break;
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to check usage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
