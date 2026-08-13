"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { submitSellerApplication, type SellerApplicationState } from "@/lib/actions/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: SellerApplicationState = {};

export function SellerApplicationForm() {
  const [state, action, pending] = useActionState(submitSellerApplication, initialState);
  if (state.success) return <div className="rounded-xl border bg-primary/5 p-6 text-center"><p className="font-semibold">Application received</p><p className="mt-1 text-sm text-muted-foreground">{state.message}</p></div>;
  return <form action={action} className="grid gap-5 sm:grid-cols-2">
    <Field label="Business name" name="businessName" required />
    <Field label="Legal name" name="legalName" />
    <Field label="Contact name" name="contactName" required />
    <Field label="Business email" name="email" type="email" required />
    <Field label="Phone" name="phone" type="tel" required />
    <Field label="Country" name="country" required />
    <Field label="Website" name="website" type="url" placeholder="https://" />
    <Field label="Tax or registration ID" name="taxId" />
    <div className="space-y-2 sm:col-span-2"><Label htmlFor="seller-description">What do you sell?</Label><Textarea id="seller-description" name="description" minLength={30} maxLength={2000} rows={6} required placeholder="Describe your products, sourcing, and business experience." /></div>
    {state.message && <p className="text-sm text-destructive sm:col-span-2" role="alert">{state.message}</p>}
    <div className="sm:col-span-2"><Button type="submit" disabled={pending} size="lg" className="min-h-11">{pending && <Loader2 className="size-4 animate-spin" />}Submit application</Button></div>
  </form>;
}

function Field({ label, name, ...props }: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return <div className="space-y-2"><Label htmlFor={`seller-${name}`}>{label}</Label><Input id={`seller-${name}`} name={name} {...props} /></div>;
}
