"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

interface TabItem {
  label: string;
  content: string;
}

function parseTabs(raw: string | null): TabItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function TabsBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const tabs = parseTabs(c.items);
  const [active, setActive] = React.useState(0);

  if (tabs.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-center text-sm text-muted-foreground">
          No tabs configured. Add items as JSON in the block config.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      {c.title && (
        <div className="mb-8 text-center">
          {c.badge && <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">{c.badge}</p>}
          <h2 className="font-heading text-3xl font-semibold sm:text-4xl">{c.title}</h2>
        </div>
      )}
      <div className="flex flex-wrap gap-1 border-b">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors hover:text-foreground",
              active === i
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="py-6">
        <div
          className="prose prose-neutral dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(tabs[active]?.content || "") }}
        />
      </div>
    </section>
  );
}
