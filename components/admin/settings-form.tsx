"use client";

import * as React from "react";
import { useActionState } from "react";
import { CloudUpload, Loader2, Mail, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSettings, type AdminActionState } from "@/lib/cms-actions";
import type { SettingKey } from "@/lib/settings";

const initialState: AdminActionState = {};

export function SettingsForm({
  initial,
}: {
  initial: Record<SettingKey, string>;
}) {
  const [state, formAction, pending] = useActionState(updateSettings, initialState);

  React.useEffect(() => {
    if (state?.success) {
      toast.success(state.message ?? "Settings saved.");
    } else if (state?.message && !state.success) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <Section title="General">
        <Field label="Site name" name="siteName" value={initial.siteName} />
        <Field label="Tagline" name="tagline" value={initial.tagline} />
        <TextareaField
          label="Description (SEO)"
          name="description"
          value={initial.description}
          rows={5}
        />
        <Field label="Hours (display)" name="hours" value={initial.hours} />
        <Field label="Price range" name="priceRange" value={initial.priceRange} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rating" name="rating" value={initial.rating} />
          <Field label="Review count" name="reviewCount" value={initial.reviewCount} />
        </div>
      </Section>

      <Section title="Hero section">
        <Field label="Badge (top pill)" name="heroBadge" value={initial.heroBadge} />
        <Field label="Hero title" name="heroTitle" value={initial.heroTitle} />
        <TextareaField
          label="Hero subtitle"
          name="heroSubtitle"
          value={initial.heroSubtitle}
          rows={3}
        />
        <ImageField label="Hero background image" name="heroImage" value={initial.heroImage} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary button text" name="heroCtaPrimary" value={initial.heroCtaPrimary} />
          <Field label="Secondary button text" name="heroCtaSecondary" value={initial.heroCtaSecondary} />
        </div>
      </Section>

      <Section title="About">
        <Field label="About title" name="aboutTitle" value={initial.aboutTitle} />
        <TextareaField
          label="About text"
          name="aboutText"
          value={initial.aboutText}
          rows={6}
        />
        <ImageField label="About image" name="aboutImage" value={initial.aboutImage} />
      </Section>

      <Section title="Contact & Location">
        <Field label="Address" name="address" value={initial.address} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" name="phone" value={initial.phone} />
          <Field label="Email" name="email" value={initial.email} />
        </div>
        <Field label="Map search query" name="mapQuery" value={initial.mapQuery} />
      </Section>

      <Section
        title="Features (cards on home page)"
        hint="One JSON array of {title, text, icon} objects."
      >
        <TextareaField
          label="Features JSON"
          name="features"
          value={initial.features}
          rows={10}
        />
      </Section>

      <Section
        title="Services & amenities"
        hint="A JSON array of strings shown as badges."
      >
        <TextareaField
          label="Services JSON"
          name="services"
          value={initial.services}
          rows={8}
        />
      </Section>

      <Section title="Footer">
        <TextareaField
          label="Footer note"
          name="footerNote"
          value={initial.footerNote}
          rows={2}
        />
      </Section>

      <Section
        title="Cloudinary (image uploads)"
        icon={<CloudUpload className="size-4" />}
        hint="Used by the gallery, menu and every image upload. Empty values fall back to CLOUDINARY_* env vars."
      >
        <Field
          label="Cloud name"
          name="cloudinaryCloudName"
          value={initial.cloudinaryCloudName}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField label="API key" name="cloudinaryApiKey" value={initial.cloudinaryApiKey} />
          <PasswordField label="API secret" name="cloudinaryApiSecret" value={initial.cloudinaryApiSecret} />
        </div>
      </Section>

      <Section
        title="Email / SMTP"
        icon={<Mail className="size-4" />}
        hint="Used for booking confirmations and admin alerts. Empty values fall back to SMTP_* env vars. Works with Gmail app passwords, Brevo, Mailgun, SendGrid, etc."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SMTP host" name="smtpHost" value={initial.smtpHost} placeholder="smtp.gmail.com" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Port" name="smtpPort" value={initial.smtpPort} placeholder="587" />
            <div className="space-y-2">
              <Label htmlFor="s-smtpSecure">Secure (SSL)</Label>
              <Select
                name="smtpSecure"
                defaultValue={initial.smtpSecure === "true" ? "true" : "false"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">No (STARTTLS — port 587)</SelectItem>
                  <SelectItem value="true">Yes (SSL/TLS — port 465)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Username" name="smtpUser" value={initial.smtpUser} />
          <PasswordField label="Password / app password" name="smtpPass" value={initial.smtpPass} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From address" name="smtpFrom" value={initial.smtpFrom} placeholder="Maiti Resort <no-reply@…>" />
          <Field label="Admin notify email" name="adminNotifyEmail" value={initial.adminNotifyEmail} placeholder="admin@maitiresort.com" />
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} size="lg" className="gap-2">
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save changes
            </>
          )}
        </Button>
        {state?.success && (
          <p className="text-sm text-emerald-600">Saved successfully.</p>
        )}
      </div>
    </form>
  );
}

function Section({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading">
          {icon && <span className="text-primary">{icon}</span>}
          {title}
        </CardTitle>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  name,
  value,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`s-${name}`}>{label}</Label>
      <Input id={`s-${name}`} name={name} defaultValue={value} placeholder={placeholder} />
    </div>
  );
}

function PasswordField({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`s-${name}`}>{label}</Label>
      <Input id={`s-${name}`} name={name} type="password" defaultValue={value} autoComplete="off" />
    </div>
  );
}

function ImageField({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: string;
}) {
  const [src, setSrc] = React.useState(value);
  return <ImageUploadField name={name} value={src} onChange={setSrc} label={label} />;
}

function TextareaField({
  label,
  name,
  value,
  rows,
}: {
  label: string;
  name: string;
  value: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`s-${name}`}>{label}</Label>
      <Textarea
        id={`s-${name}`}
        name={name}
        defaultValue={value}
        rows={rows ?? 4}
      />
    </div>
  );
}
