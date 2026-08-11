import { NextRequest, NextResponse } from "next/server";
import { getAllServerSettings } from "@/lib/data";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSiteForRequest } from "@/lib/site-context";
import { retrieveSiteContext, formatRetrievedContext } from "@/lib/ai-rag-retrieval";
import { validateAiBaseUrl } from "@/lib/ai-provider";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function buildSystemPrompt(settings: Record<string, string>, customPrompt: string): string {
  if (customPrompt) return customPrompt;
  const siteName = settings.siteName || "our business";
  const address = settings.address || "";
  const hours = settings.hours || "";
  const phone = settings.phone || "";
  const email = settings.email || "";
  return `You are a friendly, helpful AI assistant for ${siteName}.${address ? ` Located at ${address}.` : ""}${hours ? ` Open hours: ${hours}.` : ""}${phone ? ` Phone: ${phone}.` : ""}${email ? ` Email: ${email}.` : ""}

Be concise, conversational, and helpful. Answer questions about the menu, hours, location, reservations, and services. If asked about something you don't know, politely suggest contacting the business directly.`;
}

async function callOpenAI(apiKey: string, model: string, baseUrl: string, messages: ChatMessage[]): Promise<string> {
  const url = (baseUrl || "https://api.openai.com/v1") + "/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: 1024, temperature: 0.7 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Chat API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
}

async function callAnthropic(apiKey: string, model: string, baseUrl: string, messages: ChatMessage[]): Promise<string> {
  const url = (baseUrl || "https://api.anthropic.com") + "/v1/messages";
  const systemMsg = messages.find((m) => m.role === "system");
  const nonSystem = messages.filter((m) => m.role !== "system");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemMsg?.content ?? "",
      messages: nonSystem.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? "Sorry, I couldn't generate a response.";
}

async function callGoogle(apiKey: string, model: string, baseUrl: string, messages: ChatMessage[]): Promise<string> {
  const systemMsg = messages.find((m) => m.role === "system");
  const nonSystem = messages.filter((m) => m.role !== "system");
  const url =
    (baseUrl || `https://generativelanguage.googleapis.com/v1beta`) +
    `/models/${model || "gemini-2.0-flash"}:generateContent?key=${apiKey}`;
  const contents = nonSystem.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
      contents,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google AI API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sorry, I couldn't generate a response.";
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting — scoped per IP to prevent AI cost abuse
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const { allowed } = await checkRateLimit(`chat:${ip}`);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
      );
    }

    const { messages } = (await req.json()) as { messages: ChatMessage[] };
    if (!messages?.length) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    const host = (req.headers.get("host") ?? "").split(":")[0];
    const siteSlug = process.env.NODE_ENV === "development"
      ? req.nextUrl.searchParams.get("site")
      : null;
    const site = await getSiteForRequest(host, siteSlug);
    if (!site?.published) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }
    const settings = await getAllServerSettings(site.id);

    if (settings.aiChatEnabled !== "true" && settings.aiRagEnabled !== "true") {
      return NextResponse.json({ error: "AI chat is disabled" }, { status: 403 });
    }
    if (!settings.aiApiKey) {
      return NextResponse.json({ error: "AI API key not configured" }, { status: 500 });
    }
    let safeBaseUrl: string;
    try {
      safeBaseUrl = validateAiBaseUrl(settings.aiBaseUrl);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid AI base URL" }, { status: 500 });
    }

    const systemPrompt = buildSystemPrompt(settings, settings.aiSystemPrompt);

    // RAG: enrich the system prompt with the most relevant site content.
    let fullSystemPrompt = systemPrompt;
    if (settings.aiRagEnabled === "true") {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const retrieved = lastUser
        ? await retrieveSiteContext(site.id, lastUser.content)
        : [];
      const context = formatRetrievedContext(retrieved);
      if (context) {
        fullSystemPrompt = `${systemPrompt}\n\n${context}\n\nIf the answer is not in the site content, say you're not sure and suggest contacting the venue directly.`;
      }
    }

    const fullMessages: ChatMessage[] = [
      { role: "system", content: fullSystemPrompt },
      ...messages,
    ];

    let reply: string;
    switch (settings.aiProvider) {
      case "anthropic":
         reply = await callAnthropic(settings.aiApiKey, settings.aiModel, safeBaseUrl, fullMessages);
        break;
      case "google":
         reply = await callGoogle(settings.aiApiKey, settings.aiModel, safeBaseUrl, fullMessages);
        break;
      default:
         reply = await callOpenAI(settings.aiApiKey, settings.aiModel, safeBaseUrl, fullMessages);
        break;
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
