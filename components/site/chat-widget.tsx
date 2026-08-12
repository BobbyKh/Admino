"use client";

import * as React from "react";
import { X, Send, Loader2, Bot, ExternalLink } from "lucide-react";
import { parseChatContent } from "@/lib/chat-content";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function ChatMessageContent({ content }: { content: string }) {
  return (
    <div className="whitespace-pre-wrap break-words">
      {parseChatContent(content).map((part, index) => {
        if (part.type === "image") {
          return (
            <a
              key={`${part.src}-${index}`}
              href={part.src}
              target="_blank"
              rel="noopener noreferrer"
              className="my-2 block overflow-hidden rounded-xl border bg-background first:mt-0 last:mb-0"
            >
              {/* Chat images can come from tenant content or user-supplied external URLs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={part.src}
                alt={part.alt}
                loading="lazy"
                className="max-h-56 w-full object-contain"
              />
            </a>
          );
        }
        if (part.type === "link") {
          const external = /^https?:\/\//i.test(part.href);
          return (
            <a
              key={`${part.href}-${index}`}
              href={part.href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              className="inline-flex max-w-full items-baseline gap-1 font-medium underline underline-offset-2 hover:opacity-80"
            >
              <span className="break-all">{part.label}</span>
              {external && <ExternalLink className="size-3 shrink-0" aria-hidden="true" />}
            </a>
          );
        }
        return <React.Fragment key={index}>{part.value}</React.Fragment>;
      })}
    </div>
  );
}

export function ChatWidget({ siteName }: { siteName: string }) {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const siteSlug = new URLSearchParams(window.location.search).get("site");
      const res = await fetch(siteSlug ? `/api/chat?site=${encodeURIComponent(siteSlug)}` : "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get response");
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
        aria-label={open ? "Close chat" : "Open chat assistant"}
      >
        {open ? <X className="size-6" /> : <Bot className="size-6" />}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary-foreground/20">
              <Bot className="size-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">{siteName} Assistant</p>
              <p className="text-xs opacity-70">Ask me anything about this site</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 300, maxHeight: 420 }}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <Bot className="mb-3 size-10 opacity-30" />
                <p className="text-sm font-medium">Hi! How can I help you today?</p>
                <p className="mt-1 text-xs">Ask about our content, products, or services.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  <ChatMessageContent content={msg.content} />
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-2xl bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2 border-t p-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              disabled={loading}
              className="flex-1 rounded-full border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
