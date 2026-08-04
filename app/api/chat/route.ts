import { NextRequest, NextResponse } from "next/server";
import { getAllServerSettings } from "@/lib/data";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSiteForRequest } from "@/lib/site-context";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function buildSystemPrompt(settings: Record<string, string>, customPrompt: string): string {
  if (customPrompt) return customPrompt;
  return `You are a friendly, helpful AI assistant for ${settings.siteName || "Maiti Resort"}, a dining and relaxation venue in Kirtipur, Nepal.

Key facts:
- Address: ${settings.address || "Kirtipur 44600, Nepal"}
- Hours: ${settings.hours || "Open daily 10 AM – 10 PM"}
- Phone: ${settings.phone || "+977 974-6510970"}
- Email: ${settings.email || "hello@maitiresort.com"}
- Price range: ${settings.priceRange || "NPR 500 – NPR 1,000"}
- Rating: ${settings.rating || "4.2"} (${settings.reviewCount || "120+"} reviews)
- Services: Dine-in, Takeout, Curbside pickup
- Menu categories: Breakfast, Lunch & Dinner, Desserts, Coffee & Bar

Be concise, conversational, and helpful. Answer questions about the menu, hours, location, reservations, and services. If asked about something you don't know, politely suggest contacting the resort directly.`;
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
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const { allowed } = checkRateLimit(ip);
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

    if (settings.aiChatEnabled !== "true") {
      return NextResponse.json({ error: "AI chat is disabled" }, { status: 403 });
    }
    if (!settings.aiApiKey) {
      return NextResponse.json({ error: "AI API key not configured" }, { status: 500 });
    }

    const systemPrompt = buildSystemPrompt(settings, settings.aiSystemPrompt);
    const fullMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    let reply: string;
    switch (settings.aiProvider) {
      case "anthropic":
        reply = await callAnthropic(settings.aiApiKey, settings.aiModel, settings.aiBaseUrl, fullMessages);
        break;
      case "google":
        reply = await callGoogle(settings.aiApiKey, settings.aiModel, settings.aiBaseUrl, fullMessages);
        break;
      default:
        reply = await callOpenAI(settings.aiApiKey, settings.aiModel, settings.aiBaseUrl, fullMessages);
        break;
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
