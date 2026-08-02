"use client";

import * as React from "react";
import { Send, MapPin, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function ContactFormBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const [submitted, setSubmitted] = React.useState(false);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">
            {c.badge || "Contact"}
          </p>
          <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
            {c.title || "Get in Touch"}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {c.subtitle || "We'd love to hear from you. Send us a message and we'll respond as soon as possible."}
          </p>
          <div className="mt-8 space-y-4">
            {(c.address || !c.badge) && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 text-primary" />
                <div>
                  <p className="font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">{c.address || "123 Main St, City"}</p>
                </div>
              </div>
            )}
            {c.phone && (
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 size-5 text-primary" />
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{c.phone}</p>
                </div>
              </div>
            )}
            {c.email && (
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-5 text-primary" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{c.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
                  <Send className="size-8 text-primary" />
                </div>
                <h3 className="font-heading text-xl font-semibold">Message Sent!</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {c.successMessage || "Thank you for your message. We'll get back to you shortly."}
                </p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cf-name">Name *</Label>
                    <Input id="cf-name" placeholder="Your name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cf-email">Email *</Label>
                    <Input id="cf-email" type="email" placeholder="you@example.com" required />
                  </div>
                </div>
                {c.showPhone === "true" && (
                  <div className="space-y-2">
                    <Label htmlFor="cf-phone">Phone</Label>
                    <Input id="cf-phone" type="tel" placeholder="+1 (555) 000-0000" />
                  </div>
                )}
                {c.showSubject === "true" && (
                  <div className="space-y-2">
                    <Label htmlFor="cf-subject">Subject</Label>
                    <Input id="cf-subject" placeholder="How can we help?" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="cf-message">Message *</Label>
                  <Textarea id="cf-message" placeholder="Tell us what you need..." rows={5} required />
                </div>
                <Button type="submit" className="w-full gap-2">
                  {c.buttonText || "Send Message"}
                  <Send className="size-4" />
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
