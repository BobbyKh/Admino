/**
 * Shared AI provider caller — supports OpenAI (and compatible), Anthropic, Google, and custom endpoints.
 * Used by all AI server actions to avoid duplicated provider logic.
 */

export interface AiProviderConfig {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

/** Reject custom AI endpoints that could expose credentials to local services. */
export function validateAiBaseUrl(baseUrl?: string): string {
  const value = baseUrl?.trim().replace(/\/+$/, "") ?? "";
  if (!value) return "";

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("AI base URL must be a valid URL.");
  }

  if (url.username || url.password || !["https:", ...(process.env.NODE_ENV === "development" ? ["http:"] : [])].includes(url.protocol)) {
    throw new Error("AI base URL must use HTTPS and cannot contain credentials.");
  }

  const host = url.hostname.toLowerCase();
  const isPrivateIpv4 = /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host);
  const isPrivateIpv6 = host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:");
  if (host === "localhost" || host === "metadata.google.internal" || isPrivateIpv4 || isPrivateIpv6) {
    throw new Error("Private or local AI base URLs are not allowed.");
  }

  return url.toString().replace(/\/+$/, "");
}

export async function callAiProvider(config: AiProviderConfig): Promise<string> {
  const {
    provider,
    apiKey,
    model,
    baseUrl,
    systemPrompt,
    userPrompt,
    maxTokens = 1600,
    temperature = 0.6,
    jsonMode = false,
  } = config;

  if (!apiKey) throw new Error("AI API key not configured.");
  const safeBaseUrl = validateAiBaseUrl(baseUrl);
  if (safeBaseUrl && new URL(safeBaseUrl).hostname.toLowerCase() === "fal.run") {
    throw new Error(
      "The configured fal.run URL is an image-generation endpoint, not a text AI base URL. Blocks and AI layouts use the shared text AI configuration in Settings → Integrations. Configure an OpenAI-compatible, Anthropic, or Google text endpoint there."
    );
  }

  switch (provider) {
    case "anthropic":
      return callAnthropic(apiKey, model, safeBaseUrl, systemPrompt, userPrompt, maxTokens, temperature);
    case "google":
      return callGoogle(apiKey, model, safeBaseUrl, systemPrompt, userPrompt, maxTokens, temperature);
    default:
      // "openai", "custom", or any OpenAI-compatible provider
      return callOpenAI(apiKey, model, safeBaseUrl, systemPrompt, userPrompt, maxTokens, temperature, jsonMode);
  }
}

async function callOpenAI(
  apiKey: string,
  model: string,
  baseUrl: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  temperature: number,
  jsonMode: boolean
): Promise<string> {
  const body: Record<string, unknown> = {
    model: model || "gpt-4o-mini",
    max_tokens: maxTokens,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const url = `${baseUrl || "https://api.openai.com/v1"}/chat/completions`;
  console.log("[ai-provider] POST", url, "model:", model, "jsonMode:", jsonMode);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await formatProviderError(res, baseUrl || "https://api.openai.com/v1"));
  const data = await res.json();
  return String(data.choices?.[0]?.message?.content ?? "");
}

async function callAnthropic(
  apiKey: string,
  model: string,
  baseUrl: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const res = await fetch(`${baseUrl || "https://api.anthropic.com"}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(await formatProviderError(res, baseUrl || "https://api.anthropic.com"));
  const data = await res.json();
  return String(data.content?.[0]?.text ?? "");
}

async function callGoogle(
  apiKey: string,
  model: string,
  baseUrl: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const url = `${baseUrl || "https://generativelanguage.googleapis.com/v1beta"}/models/${model || "gemini-2.0-flash"}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    }),
  });
  if (!res.ok) throw new Error(await formatProviderError(res, baseUrl || "https://generativelanguage.googleapis.com"));
  const data = await res.json();
  return String(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
}

async function formatProviderError(response: Response, url: string): Promise<string> {
  const status = response.status;
  if (status === 401) return `API key rejected by ${url}. Verify your key and base URL in Settings → AI.`;
  if (status === 402) return `Billing error at ${url} — no credits available. Add credits or check your plan.`;
  if (status === 429) {
    const retryAfter = response.headers.get("retry-after");
    return retryAfter
      ? `Rate limit reached at ${url}. Try again in about ${retryAfter} seconds.`
      : `Rate limit reached at ${url}. Wait a moment, then try again.`;
  }
  const body = await response.text().catch(() => "").then((t) => t.slice(0, 200));
  return `AI API error ${status} from ${url}${body ? `: ${body}` : ""}`;
}
