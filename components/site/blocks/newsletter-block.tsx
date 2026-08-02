"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function NewsletterBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const [submitted, setSubmitted] = React.useState(false);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl bg-primary/5 px-6 py-12 text-center sm:px-12">
        <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
          {c.title || "Subscribe to Our Newsletter"}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          {c.subtitle || "Stay updated with our latest news and offers."}
        </p>
        {submitted ? (
          <p className="mt-6 font-medium text-primary">
            {c.successMessage || "Thank you for subscribing!"}
          </p>
        ) : (
          <form
            className="mx-auto mt-6 flex max-w-md gap-2"
            onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
          >
            <Input
              type="email"
              placeholder={c.placeholder || "Enter your email"}
              required
              className="flex-1"
            />
            <Button type="submit" className="gap-2">
              {c.buttonText || "Subscribe"}
              <Send className="size-4" />
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
