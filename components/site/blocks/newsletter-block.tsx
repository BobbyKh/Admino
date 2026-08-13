"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeNewsletter } from "@/lib/actions/index";
import { useSearchParams } from "next/navigation";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function NewsletterBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const locale = useSearchParams().get("locale") ?? "en";
  const [state, action, pending] = React.useActionState(subscribeNewsletter, { success: false, message: "" });

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl bg-primary/5 px-6 py-12 text-center sm:px-12">
        <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
          {c.title || "Subscribe to Our Newsletter"}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          {c.subtitle || "Stay updated with our latest news and offers."}
        </p>
        {state.success ? (
          <p className="mt-6 font-medium text-primary">
            {state.message || c.successMessage || "Check your email to confirm your subscription."}
          </p>
        ) : (
          <form action={action} className="mx-auto mt-6 max-w-md space-y-3">
            <div className="flex gap-2">
            <Input
              name="email"
              type="email"
              placeholder={c.placeholder || "Enter your email"}
              required
              className="flex-1"
            />
            <Button type="submit" className="gap-2" disabled={pending}>
              {c.buttonText || "Subscribe"}
              <Send className="size-4" />
            </Button>
            </div>
            <input type="hidden" name="source" value="page-builder-newsletter" />
            <input type="hidden" name="locale" value={locale} />
            <label className="flex items-start gap-2 text-left text-xs text-muted-foreground"><input type="checkbox" name="consent" required className="mt-0.5" /><span>I agree to receive product news and marketing emails. I can unsubscribe at any time.</span></label>
            {!state.success && state.message && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
          </form>
        )}
      </div>
    </section>
  );
}
