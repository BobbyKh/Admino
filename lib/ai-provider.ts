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

  switch (provider) {
    case "anthropic":
      return callAnthropic(apiKey, model, baseUrl, systemPrompt, userPrompt, maxTokens, temperature);
    case "google":
      return callGoogle(apiKey, model, baseUrl, systemPrompt, userPrompt, maxTokens, temperature);
    default:
      // "openai", "custom", or any OpenAI-compatible provider
      return callOpenAI(apiKey, model, baseUrl, systemPrompt, userPrompt, maxTokens, temperature, jsonMode);
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

  const res = await fetch(`${baseUrl || "https://api.openai.com/v1"}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await formatProviderError(res, "OpenAI"));
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
  if (!res.ok) throw new Error(await formatProviderError(res, "Anthropic"));
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
  if (!res.ok) throw new Error(await formatProviderError(res, "Google"));
  const data = await res.json();
  return String(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
}

async function formatProviderError(response: Response, providerName: string): Promise<string> {
  const status = response.status;
  if (status === 401) return `Invalid ${providerName} API key. Check your key in Settings → AI.`;
  if (status === 402) return `${providerName} billing error — no credits available. Add credits or select a funded model in Settings → AI.`;
  if (status === 429) {
    const retryAfter = response.headers.get("retry-after");
    return retryAfter
      ? `${providerName} rate limit reached. Try again in about ${retryAfter} seconds.`
      : `${providerName} rate limit reached. Wait a moment, then try again.`;
  }
  const body = await response.text().catch(() => "").then((t) => t.slice(0, 200));
  return `${providerName} API error ${status}${body ? `: ${body}` : ""}`;
}
