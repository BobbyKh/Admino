"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, Sparkles, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { runAiSiteBuilder, type BuilderMessage } from "@/lib/actions/ai-builder";
import { useAdminSiteId } from "./admin-site-context";

const SUGGESTIONS = [
  "Build me a homepage for my restaurant with a hero, features, and a reservation CTA",
  "Add an About page with a text block describing my story",
  "Add a new menu product called Margherita Pizza for $14.50",
  "Update the hero title to 'Fresh Italian Cuisine'",
];

interface UiMessage {
  role: "user" | "assistant";
  content: string;
  actions?: Array<{ id: number; type: string; detail: string }>;
}

export function AiSiteBuilder() {
  const siteId = useAdminSiteId();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const body = (text ?? input).trim();
    if (!body || loading) return;
    setInput("");
    setLoading(true);

    const history: BuilderMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
    const userMsg: UiMessage = { role: "user", content: body };
    setMessages((prev) => [...prev, userMsg]);

    const result = await runAiSiteBuilder(siteId, [...history, { role: "user", content: body }]);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${result.error}` }]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: result.reply, actions: result.actions },
    ]);
  }

  function reset() {
    setMessages([]);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Site Builder</h1>
          <p className="text-sm text-muted-foreground">
            Build and edit pages, blocks, and products by talking to an AI agent.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reset} disabled={loading || messages.length === 0}>
          <RotateCcw className="size-4" />
          New session
        </Button>
      </div>

      <Card>
        <CardContent className="flex h-[540px] flex-col p-0">
          <div className="flex-1 overflow-y-auto space-y-4 p-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="size-7 text-primary" />
                </span>
                <p className="text-lg font-semibold">What should I build today?</p>
                <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                  I can create pages, add content blocks, publish them, and manage products.
                  I&apos;ll make changes directly to your site.
                </p>
                <div className="grid w-full max-w-md gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      disabled={loading}
                      className="rounded-lg border bg-muted/30 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] space-y-2 rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md bg-muted text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.actions && msg.actions.length > 0 && (
                    <ul className="space-y-1 border-t pt-2 text-xs opacity-90">
                      {msg.actions.map((a) => (
                        <li key={`${a.id}-${a.type}`}>• {a.detail}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Thinking and planning...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you want to build or change..."
              disabled={loading}
              className="flex-1 rounded-full border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || loading} className="rounded-full">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Bot className="size-3.5" />
        Changes are applied immediately to your site. Draft pages must be published before visitors can see them.
      </p>
    </div>
  );
}
