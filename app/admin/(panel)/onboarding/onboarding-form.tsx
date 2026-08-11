"use client";

import * as React from "react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen, Globe, Palette, Settings, Sparkles } from "lucide-react";
import { onboardSite } from "@/lib/actions/index";
import { TENANT_FEATURE_METADATA, FEATURE_CATEGORIES, type TenantFeature } from "@/lib/tenant-features-constants";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type State = { success?: boolean; message?: string; data?: { siteId?: number } };
const initialState: State = {};
const defaultFeatures = Object.keys(TENANT_FEATURE_METADATA).filter((key) => !key.startsWith("ai_")) as TenantFeature[];

export function OnboardingForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(onboardSite, initialState);
  const [logo, setLogo] = useState("");
  const [favicon, setFavicon] = useState("");
  const [features, setFeatures] = useState<TenantFeature[]>(defaultFeatures);

  useEffect(() => {
    if (state.success && state.data?.siteId) router.push(`/admin/pages?siteId=${state.data.siteId}`);
  }, [router, state]);

  return (
    <form action={formAction} className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Tenant onboarding</p>
        <h1 className="font-heading text-3xl font-semibold">Launch a new site</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create the tenant, starter content, branding, contact details, feature plan, and launch checklist baseline in one flow.</p>
        <Link
          href="/admin/docs?cat=getting-started"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <BookOpen className="size-4" />
          Read the getting-started guide before you launch
        </Link>
      </div>

      {state.message && !state.success && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.message}</p>}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="size-4" />Basics</CardTitle><CardDescription>Choose the tenant identity and starter template.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Site name" name="name" required placeholder="Acme Store" />
          <Field label="Slug" name="slug" placeholder="acme-store" />
          <div className="space-y-2"><Label htmlFor="template">Template</Label><select id="template" name="template" defaultValue="business" className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="blank">Blank</option><option value="restaurant">Restaurant</option><option value="portfolio">Portfolio</option><option value="business">Business</option><option value="blog">Blog</option><option value="ecommerce">E-commerce</option><option value="landing">Landing Page</option></select></div>
          <Field label="Custom domain" name="domain" placeholder="www.example.com" />
          <div className="md:col-span-2"><TextareaField label="Description" name="description" placeholder="Short SEO/business description" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="size-4" />Branding</CardTitle><CardDescription>These values appear in the navbar, footer, favicon, metadata, and admin sidebar.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Tagline" name="tagline" placeholder="A clear short promise" />
          <ImageUploadField label="Logo" name="logo" value={logo} onChange={setLogo} />
          <ImageUploadField label="Favicon" name="favicon" value={favicon} onChange={setFavicon} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="size-4" />Contact</CardTitle><CardDescription>Used by public pages, footer, notifications, and publish readiness.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Email" name="email" type="email" placeholder="hello@example.com" />
          <Field label="Admin notify email" name="adminNotifyEmail" type="email" placeholder="orders@example.com" />
          <Field label="Phone" name="phone" placeholder="+1 555 0100" />
          <Field label="Address" name="address" placeholder="City, country" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-4" />Feature plan</CardTitle><CardDescription>Enable the tenant modules available after onboarding.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {FEATURE_CATEGORIES.map((category) => {
            const items = Object.values(TENANT_FEATURE_METADATA).filter((meta) => meta.category === category);
            return <div key={category}><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{category}</p><div className="grid gap-2 md:grid-cols-2">{items.map((meta) => <label key={meta.key} className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" name={`feature_${meta.key}`} checked={features.includes(meta.key)} onChange={() => setFeatures((prev) => prev.includes(meta.key) ? prev.filter((key) => key !== meta.key) : [...prev, meta.key])} />{meta.label}</label>)}</div></div>;
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled={pending} size="lg" className="gap-2">{pending ? "Creating..." : "Create site and continue"}<ArrowRight className="size-4" /></Button>
      </div>
    </form>
  );
}

function Field({ label, name, ...props }: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...props} /></div>;
}

function TextareaField({ label, name, ...props }: React.ComponentProps<typeof Textarea> & { label: string; name: string }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Textarea id={name} name={name} rows={3} {...props} /></div>;
}
