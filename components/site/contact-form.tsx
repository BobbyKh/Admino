"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContact, type ContactFormState } from "@/lib/actions";

const initialState: ContactFormState = {};

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContact, initialState);

  React.useEffect(() => {
    if (state?.success) {
      toast.success(state.message ?? "Message sent!");
    } else if (state?.message && !state.success) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="c-name">Name *</Label>
          <Input id="c-name" name="name" placeholder="Your name" required />
          {state?.errors?.name && (
            <p className="text-sm text-destructive">{state.errors.name[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-email">Email *</Label>
          <Input id="c-email" name="email" type="email" placeholder="you@example.com" required />
          {state?.errors?.email && (
            <p className="text-sm text-destructive">{state.errors.email[0]}</p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="c-phone">Phone</Label>
          <Input id="c-phone" name="phone" type="tel" placeholder="Optional" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-subject">Subject *</Label>
          <Input id="c-subject" name="subject" placeholder="How can we help?" required />
          {state?.errors?.subject && (
            <p className="text-sm text-destructive">{state.errors.subject[0]}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="c-message">Message *</Label>
        <Textarea
          id="c-message"
          name="message"
          rows={5}
          placeholder="Write your message…"
          required
        />
        {state?.errors?.message && (
          <p className="text-sm text-destructive">{state.errors.message[0]}</p>
        )}
      </div>

      <Button type="submit" disabled={pending} size="lg" className="w-full gap-2 sm:w-auto">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sending…
          </>
        ) : (
          "Send Message"
        )}
      </Button>
    </form>
  );
}
