"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

interface Step {
  title: string;
  description?: string;
  icon?: string;
}

function parseSteps(raw: string | null): Step[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function StepsBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const steps = parseSteps(c.items);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        {c.badge && <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">{c.badge}</p>}
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
          {c.title || "How It Works"}
        </h2>
      </div>
      {steps.length > 0 ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <div key={i} className="relative text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                {step.icon || i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className="absolute left-[60%] top-6 hidden h-px w-[80%] bg-border lg:block" />
              )}
              <h3 className="font-heading text-lg font-semibold">{step.title}</h3>
              {step.description && (
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          No steps configured. Add items as JSON in the block config.
        </p>
      )}
    </section>
  );
}
