"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  CloudUpload,
  Globe,
  Mail,
  Paintbrush,
  Save,
  Settings,
  Sparkles,
} from "lucide-react";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { generateThemeFromPrompt, updateSettings, type AdminActionState, type AiGeneratedTheme } from "@/lib/actions/index";
import type { SettingKey } from "@/lib/settings";

const initialState: AdminActionState = {};

const THEME_SETTING_TO_CSS: Record<string, string> = {
  themePrimary: "--primary",
  themePrimaryForeground: "--primary-foreground",
  themeSecondary: "--secondary",
  themeSecondaryForeground: "--secondary-foreground",
  themeAccent: "--accent",
  themeAccentForeground: "--accent-foreground",
  themeBackground: "--background",
  themeForeground: "--foreground",
  themeMuted: "--muted",
  themeMutedForeground: "--muted-foreground",
  themeBorder: "--border",
  themeRing: "--ring",
  themeDestructive: "--destructive",
  themeCard: "--card",
  themeCardForeground: "--card-foreground",
};

function buildThemeCss(colors: Record<string, string>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(colors)) {
    const cssVar = THEME_SETTING_TO_CSS[key];
    if (cssVar && value) {
      lines.push(`  ${cssVar}: ${value} !important;`);
    }
  }
  if (lines.length === 0) return "";
  return `:root {\n${lines.join("\n")}\n}`;
}

function getInitialThemeColors(initial: Record<string, string>): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const key of Object.keys(THEME_SETTING_TO_CSS)) {
    if (initial[key]) {
      colors[key] = initial[key];
    }
  }
  return colors;
}

export function SettingsForm({
  initial,
}: {
  initial: Record<SettingKey, string>;
}) {
  const [state, formAction, pending] = useActionState(updateSettings, initialState);
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [themeColors, setThemeColors] = React.useState<Record<string, string>>(() =>
    getInitialThemeColors(initial)
  );

  const updateThemeColor = React.useCallback((key: string, value: string) => {
    setThemeColors((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyFullPreset = React.useCallback((colors: Record<string, string>) => {
    setThemeColors(colors);
  }, []);

  React.useEffect(() => {
    if (state?.success) {
      toast.success(state.message ?? "Settings saved.");
      router.refresh();
    } else if (state?.message && !state.success) {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {Object.keys(themeColors).length > 0 && (
        <style dangerouslySetInnerHTML={{ __html: buildThemeCss(themeColors) }} />
      )}
      <Tabs defaultValue="branding">
        <TabsList variant="line" className="w-full justify-start gap-0 border-b px-1 pb-0">
          <TabsTrigger value="branding" className="gap-1.5">
            <Paintbrush className="size-3.5" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-1.5">
            <Globe className="size-3.5" />
            Contact & Info
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5">
            <Settings className="size-3.5" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-1.5">
            <Paintbrush className="size-3.5" />
            Theme
          </TabsTrigger>
        </TabsList>

        {/* ========================= BRANDING TAB ========================= */}
        <TabsContent value="branding" className="space-y-6 pt-4">
          <Section
            title="Brand Identity"
            hint="Your logo and site name appear in the navbar, footer, and throughout the site."
            icon={<Paintbrush className="size-4" />}
          >
            <ImageField label="Site logo" name="logo" value={initial.logo} />
            <Field label="Site name" name="siteName" value={initial.siteName} />
            <Field label="Tagline" name="tagline" value={initial.tagline} />
            <TextareaField
              label="Description (SEO)"
              name="description"
              value={initial.description}
              rows={5}
            />
          </Section>

          <Section
            title="About Section"
            hint="Content shown in the About section on the homepage."
          >
            <Field label="About title" name="aboutTitle" value={initial.aboutTitle} />
            <TextareaField
              label="About text"
              name="aboutText"
              value={initial.aboutText}
              rows={6}
            />
            <ImageField label="About image" name="aboutImage" value={initial.aboutImage} />
          </Section>
        </TabsContent>

        {/* ========================= CONTACT TAB ========================= */}
        <TabsContent value="contact" className="space-y-6 pt-4">
          <Section
            title="Contact Information"
            hint="Phone, email, and address shown across the site."
            icon={<Globe className="size-4" />}
          >
            <Field label="Address" name="address" value={initial.address} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone" name="phone" value={initial.phone} />
              <Field label="Email" name="email" value={initial.email} />
            </div>
            <Field label="Map search query" name="mapQuery" value={initial.mapQuery} />
          </Section>

          <Section
            title="Business Info"
            hint="Hours, pricing, and ratings shown on the site."
          >
            <Field label="Hours (display)" name="hours" value={initial.hours} />
            <Field label="Price range" name="priceRange" value={initial.priceRange} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rating" name="rating" value={initial.rating} />
              <Field label="Review count" name="reviewCount" value={initial.reviewCount} />
            </div>
          </Section>

          <Section title="Footer">
            <TextareaField
              label="Footer note"
              name="footerNote"
              value={initial.footerNote}
              rows={2}
            />
          </Section>

          <Section title="Header & Footer Navigation" hint="Edit tenant navigation links separately in Admin → Navigation.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Header button label" name="navbarCtaLabel" value={initial.navbarCtaLabel} />
              <Field label="Header button link" name="navbarCtaLink" value={initial.navbarCtaLink} placeholder="/contact" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-navbarShowPhone">Show phone button in header</Label>
              <select
                id="s-navbarShowPhone"
                name="navbarShowPhone"
                defaultValue={initial.navbarShowPhone}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="true">Show</option>
                <option value="false">Hide</option>
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Footer links heading" name="footerExploreTitle" value={initial.footerExploreTitle} />
              <Field label="Footer contact heading" name="footerContactTitle" value={initial.footerContactTitle} />
              <Field label="Footer hours heading" name="footerHoursTitle" value={initial.footerHoursTitle} />
            </div>
            <TextareaField label="Footer copyright" name="footerCopyright" value={initial.footerCopyright} rows={2} />
          </Section>
        </TabsContent>

        {/* ========================= INTEGRATIONS TAB ========================= */}
        <TabsContent value="integrations" className="space-y-6 pt-4">
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
                      <SelectValue placeholder="Select..." />
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
              <Field label="From address" name="smtpFrom" value={initial.smtpFrom} placeholder="Your Site <no-reply@...>" />
              <Field label="Admin notify email" name="adminNotifyEmail" value={initial.adminNotifyEmail} placeholder="admin@yoursite.com" />
            </div>
          </Section>

          <Section
            title="AI Chatbot Assistant"
            icon={<Bot className="size-4" />}
            hint="Configure the AI-powered chat widget shown on the public site. Supports OpenAI, Anthropic, and Google Gemini."
          >
            <AiConfigSection initial={initial} />
          </Section>
        </TabsContent>

        {/* ========================= THEME TAB ========================= */}
        <TabsContent value="theme" className="space-y-6 pt-4">
          <Section
            title="AI Theme Generator"
            hint="Describe a mood, industry, brand, or visual style. The generated palette can be previewed before you save it."
            icon={<Sparkles className="size-4" />}
          >
            <AiThemeGenerator onThemeApply={applyFullPreset} />
          </Section>

          {/* Preset Themes */}
          <Section
            title="Preset Themes"
            hint="Choose a pre-made theme or customize individual colors below."
            icon={<Paintbrush className="size-4" />}
          >
            <PresetThemes onPresetApply={applyFullPreset} />
          </Section>

          {/* Custom Colors */}
          <Section
            title="Custom Colors"
            hint="Pick colors using the visual picker or enter values in any format (hex, rgb, hsl, oklch)."
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorPickerField label="Primary" name="themePrimary" defaultValue={initial.themePrimary} onColorChange={updateThemeColor} syncedValue={themeColors.themePrimary} />
                <ColorPickerField label="Primary Foreground" name="themePrimaryForeground" defaultValue={initial.themePrimaryForeground} onColorChange={updateThemeColor} syncedValue={themeColors.themePrimaryForeground} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorPickerField label="Secondary" name="themeSecondary" defaultValue={initial.themeSecondary} onColorChange={updateThemeColor} syncedValue={themeColors.themeSecondary} />
                <ColorPickerField label="Secondary Foreground" name="themeSecondaryForeground" defaultValue={initial.themeSecondaryForeground} onColorChange={updateThemeColor} syncedValue={themeColors.themeSecondaryForeground} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorPickerField label="Accent" name="themeAccent" defaultValue={initial.themeAccent} onColorChange={updateThemeColor} syncedValue={themeColors.themeAccent} />
                <ColorPickerField label="Accent Foreground" name="themeAccentForeground" defaultValue={initial.themeAccentForeground} onColorChange={updateThemeColor} syncedValue={themeColors.themeAccentForeground} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorPickerField label="Background" name="themeBackground" defaultValue={initial.themeBackground} onColorChange={updateThemeColor} syncedValue={themeColors.themeBackground} />
                <ColorPickerField label="Foreground" name="themeForeground" defaultValue={initial.themeForeground} onColorChange={updateThemeColor} syncedValue={themeColors.themeForeground} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorPickerField label="Muted" name="themeMuted" defaultValue={initial.themeMuted} onColorChange={updateThemeColor} syncedValue={themeColors.themeMuted} />
                <ColorPickerField label="Muted Foreground" name="themeMutedForeground" defaultValue={initial.themeMutedForeground} onColorChange={updateThemeColor} syncedValue={themeColors.themeMutedForeground} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorPickerField label="Card" name="themeCard" defaultValue={initial.themeCard} onColorChange={updateThemeColor} syncedValue={themeColors.themeCard} />
                <ColorPickerField label="Card Foreground" name="themeCardForeground" defaultValue={initial.themeCardForeground} onColorChange={updateThemeColor} syncedValue={themeColors.themeCardForeground} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <ColorPickerField label="Border" name="themeBorder" defaultValue={initial.themeBorder} onColorChange={updateThemeColor} syncedValue={themeColors.themeBorder} />
                <ColorPickerField label="Ring" name="themeRing" defaultValue={initial.themeRing} onColorChange={updateThemeColor} syncedValue={themeColors.themeRing} />
                <ColorPickerField label="Destructive" name="themeDestructive" defaultValue={initial.themeDestructive} onColorChange={updateThemeColor} syncedValue={themeColors.themeDestructive} />
              </div>
            </div>
          </Section>
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} size="lg" className="gap-2">
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
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

/* ========================= SUB COMPONENTS ========================= */

function AiThemeGenerator({ onThemeApply }: { onThemeApply: (colors: Record<string, string>) => void }) {
  const [prompt, setPrompt] = React.useState("");
  const [generated, setGenerated] = React.useState<AiGeneratedTheme | null>(null);
  const [pending, startTransition] = React.useTransition();

  function generate() {
    startTransition(async () => {
      try {
        const theme = await generateThemeFromPrompt(prompt);
        setGenerated(theme);
        toast.success(`Generated ${theme.name}.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to generate theme.");
      }
    });
  }

  function applyGeneratedTheme() {
    if (!generated) return;
    onThemeApply(generated.colors);
    toast.success(`${generated.name} applied. Save changes to publish it.`);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ai-theme-prompt">Theme prompt</Label>
        <Textarea
          id="ai-theme-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={3}
          placeholder="Luxury boutique hotel with deep navy, warm gold accents, elegant editorial feel"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={generate} disabled={pending || prompt.trim().length < 8} className="gap-2">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Generate theme
        </Button>
        {generated && (
          <Button type="button" variant="outline" onClick={applyGeneratedTheme}>
            Apply generated theme
          </Button>
        )}
      </div>

      {generated && (
        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{generated.name}</p>
              {generated.rationale && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{generated.rationale}</p>}
            </div>
            <Button type="button" size="sm" onClick={applyGeneratedTheme}>Apply</Button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(generated.colors).map(([key, value]) => (
              <div key={key} className="rounded-lg border bg-background p-2">
                <div className="h-10 rounded-md border" style={{ backgroundColor: value }} />
                <p className="mt-2 truncate text-xs font-medium">{formatThemeKey(key)}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatThemeKey(key: string) {
  return key.replace(/^theme/, "").replace(/([A-Z])/g, " $1").trim();
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
  return (
    <>
      <ImageUploadField name={name} value={src} onChange={setSrc} label={label} />
      <input type="hidden" name={name} value={src} />
    </>
  );
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

function ColorPickerField({
  label,
  name,
  defaultValue,
  onColorChange,
  syncedValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
  onColorChange?: (key: string, value: string) => void;
  syncedValue?: string;
}) {
  const value = syncedValue ?? defaultValue;

  function handleChange(newValue: string) {
    onColorChange?.(name, newValue);
  }

  // Convert oklch to hex for the color input
  function oklchToHex(oklchStr: string): string {
    try {
      const match = oklchStr.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
      if (!match) return "#000000";
      const l = parseFloat(match[1]);
      const c = parseFloat(match[2]);
      const h = parseFloat(match[3]);
      // Simple approximation: oklch to RGB
      const hue = (h * Math.PI) / 180;
      const a = c * Math.cos(hue);
      const b = c * Math.sin(hue);
      const lAdj = l + 0.3963 * a + 0.2158 * b;
      const mAdj = l - 0.1055 * a - 0.0639 * b;
      const sAdj = l - 0.0895 * a - 1.2914 * b;
      const l_ = lAdj * lAdj * lAdj;
      const m_ = mAdj * mAdj * mAdj;
      const s_ = sAdj * sAdj * sAdj;
      const r = Math.round(255 * Math.max(0, Math.min(1, +4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_)));
      const g = Math.round(255 * Math.max(0, Math.min(1, -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_)));
      const b2 = Math.round(255 * Math.max(0, Math.min(1, -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_)));
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b2.toString(16).padStart(2, "0")}`;
    } catch {
      return "#000000";
    }
  }

  // Convert hex to oklch (simplified)
  function hexToOklch(hex: string): string {
    try {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
      const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
      const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
      const l_ = Math.cbrt(l);
      const m_ = Math.cbrt(m);
      const s_ = Math.cbrt(s);
      const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
      const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
      const bVal = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
      const C = Math.sqrt(a * a + bVal * bVal);
      const H = (Math.atan2(bVal, a) * 180) / Math.PI;
      const hue = H < 0 ? H + 360 : H;
      return `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${hue.toFixed(1)})`;
    } catch {
      return "oklch(0.5 0.11 155)";
    }
  }

  const hexValue = value.startsWith("oklch") ? oklchToHex(value) : value;

  return (
    <div className="space-y-2">
      <Label htmlFor={`s-${name}`}>{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={hexValue.startsWith("#") ? hexValue : "#000000"}
            onChange={(e) => {
              const hex = e.target.value;
              handleChange(hexToOklch(hex));
            }}
            className="size-9 cursor-pointer rounded-md border bg-transparent p-0.5"
          />
        </div>
        <Input
          id={`s-${name}`}
          name={name}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="flex-1 font-mono text-xs"
          placeholder="oklch(0.5 0.11 155) or #hex or rgb()"
        />
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

const THEME_PRESETS = [
  {
    name: "Forest Green",
    description: "Natural green tones",
    colors: {
      themePrimary: "oklch(0.5 0.11 155)",
      themePrimaryForeground: "oklch(0.985 0 0)",
      themeSecondary: "oklch(0.945 0.02 140)",
      themeSecondaryForeground: "oklch(0.3 0.05 150)",
      themeAccent: "oklch(0.93 0.03 90)",
      themeAccentForeground: "oklch(0.3 0.06 90)",
      themeBackground: "oklch(0.985 0.005 120)",
      themeForeground: "oklch(0.16 0.02 145)",
      themeMuted: "oklch(0.955 0.01 140)",
      themeMutedForeground: "oklch(0.5 0.02 145)",
      themeBorder: "oklch(0.9 0.015 140)",
      themeRing: "oklch(0.5 0.11 155)",
      themeDestructive: "oklch(0.577 0.245 27.325)",
      themeCard: "oklch(1 0 0)",
      themeCardForeground: "oklch(0.16 0.02 145)",
    },
  },
  {
    name: "Ocean Blue",
    description: "Cool ocean-inspired blues",
    colors: {
      themePrimary: "oklch(0.5 0.1 240)",
      themePrimaryForeground: "oklch(0.985 0 0)",
      themeSecondary: "oklch(0.94 0.015 230)",
      themeSecondaryForeground: "oklch(0.3 0.04 240)",
      themeAccent: "oklch(0.92 0.03 200)",
      themeAccentForeground: "oklch(0.3 0.05 200)",
      themeBackground: "oklch(0.98 0.005 230)",
      themeForeground: "oklch(0.17 0.02 240)",
      themeMuted: "oklch(0.95 0.01 230)",
      themeMutedForeground: "oklch(0.5 0.02 230)",
      themeBorder: "oklch(0.89 0.015 230)",
      themeRing: "oklch(0.5 0.1 240)",
      themeDestructive: "oklch(0.577 0.245 27.325)",
      themeCard: "oklch(1 0 0)",
      themeCardForeground: "oklch(0.17 0.02 240)",
    },
  },
  {
    name: "Royal Purple",
    description: "Rich purple tones",
    colors: {
      themePrimary: "oklch(0.48 0.12 300)",
      themePrimaryForeground: "oklch(0.985 0 0)",
      themeSecondary: "oklch(0.94 0.02 290)",
      themeSecondaryForeground: "oklch(0.3 0.05 300)",
      themeAccent: "oklch(0.92 0.03 320)",
      themeAccentForeground: "oklch(0.3 0.06 320)",
      themeBackground: "oklch(0.98 0.005 300)",
      themeForeground: "oklch(0.17 0.02 300)",
      themeMuted: "oklch(0.95 0.01 290)",
      themeMutedForeground: "oklch(0.5 0.02 300)",
      themeBorder: "oklch(0.89 0.015 290)",
      themeRing: "oklch(0.48 0.12 300)",
      themeDestructive: "oklch(0.577 0.245 27.325)",
      themeCard: "oklch(1 0 0)",
      themeCardForeground: "oklch(0.17 0.02 300)",
    },
  },
  {
    name: "Sunset Orange",
    description: "Warm sunset hues",
    colors: {
      themePrimary: "oklch(0.6 0.14 40)",
      themePrimaryForeground: "oklch(0.985 0 0)",
      themeSecondary: "oklch(0.94 0.02 60)",
      themeSecondaryForeground: "oklch(0.3 0.05 40)",
      themeAccent: "oklch(0.92 0.04 30)",
      themeAccentForeground: "oklch(0.3 0.06 30)",
      themeBackground: "oklch(0.985 0.005 60)",
      themeForeground: "oklch(0.17 0.02 40)",
      themeMuted: "oklch(0.95 0.01 60)",
      themeMutedForeground: "oklch(0.5 0.02 50)",
      themeBorder: "oklch(0.9 0.015 50)",
      themeRing: "oklch(0.6 0.14 40)",
      themeDestructive: "oklch(0.577 0.245 27.325)",
      themeCard: "oklch(1 0 0)",
      themeCardForeground: "oklch(0.17 0.02 40)",
    },
  },
  {
    name: "Rose Pink",
    description: "Soft rose and pink tones",
    colors: {
      themePrimary: "oklch(0.55 0.12 350)",
      themePrimaryForeground: "oklch(0.985 0 0)",
      themeSecondary: "oklch(0.94 0.02 340)",
      themeSecondaryForeground: "oklch(0.3 0.05 350)",
      themeAccent: "oklch(0.92 0.03 10)",
      themeAccentForeground: "oklch(0.3 0.06 10)",
      themeBackground: "oklch(0.985 0.005 350)",
      themeForeground: "oklch(0.17 0.02 350)",
      themeMuted: "oklch(0.95 0.01 340)",
      themeMutedForeground: "oklch(0.5 0.02 350)",
      themeBorder: "oklch(0.9 0.015 340)",
      themeRing: "oklch(0.55 0.12 350)",
      themeDestructive: "oklch(0.577 0.245 27.325)",
      themeCard: "oklch(1 0 0)",
      themeCardForeground: "oklch(0.17 0.02 350)",
    },
  },
  {
    name: "Warm Gold",
    description: "Elegant gold and amber",
    colors: {
      themePrimary: "oklch(0.6 0.13 75)",
      themePrimaryForeground: "oklch(0.17 0.02 75)",
      themeSecondary: "oklch(0.94 0.02 80)",
      themeSecondaryForeground: "oklch(0.3 0.05 75)",
      themeAccent: "oklch(0.92 0.04 65)",
      themeAccentForeground: "oklch(0.3 0.06 65)",
      themeBackground: "oklch(0.985 0.005 80)",
      themeForeground: "oklch(0.17 0.02 75)",
      themeMuted: "oklch(0.95 0.01 80)",
      themeMutedForeground: "oklch(0.5 0.02 75)",
      themeBorder: "oklch(0.9 0.015 80)",
      themeRing: "oklch(0.6 0.13 75)",
      themeDestructive: "oklch(0.577 0.245 27.325)",
      themeCard: "oklch(1 0 0)",
      themeCardForeground: "oklch(0.17 0.02 75)",
    },
  },
  {
    name: "Slate Minimal",
    description: "Clean neutral grays",
    colors: {
      themePrimary: "oklch(0.45 0.01 250)",
      themePrimaryForeground: "oklch(0.985 0 0)",
      themeSecondary: "oklch(0.94 0.005 250)",
      themeSecondaryForeground: "oklch(0.3 0.01 250)",
      themeAccent: "oklch(0.92 0.01 250)",
      themeAccentForeground: "oklch(0.3 0.01 250)",
      themeBackground: "oklch(0.985 0.002 250)",
      themeForeground: "oklch(0.17 0.01 250)",
      themeMuted: "oklch(0.95 0.005 250)",
      themeMutedForeground: "oklch(0.5 0.01 250)",
      themeBorder: "oklch(0.89 0.008 250)",
      themeRing: "oklch(0.45 0.01 250)",
      themeDestructive: "oklch(0.577 0.245 27.325)",
      themeCard: "oklch(1 0 0)",
      themeCardForeground: "oklch(0.17 0.01 250)",
    },
  },
  {
    name: "Crimson Red",
    description: "Bold red accents",
    colors: {
      themePrimary: "oklch(0.55 0.2 25)",
      themePrimaryForeground: "oklch(0.985 0 0)",
      themeSecondary: "oklch(0.94 0.02 15)",
      themeSecondaryForeground: "oklch(0.3 0.05 25)",
      themeAccent: "oklch(0.92 0.03 350)",
      themeAccentForeground: "oklch(0.3 0.06 350)",
      themeBackground: "oklch(0.985 0.005 15)",
      themeForeground: "oklch(0.17 0.02 25)",
      themeMuted: "oklch(0.95 0.01 15)",
      themeMutedForeground: "oklch(0.5 0.02 25)",
      themeBorder: "oklch(0.9 0.015 15)",
      themeRing: "oklch(0.55 0.2 25)",
      themeDestructive: "oklch(0.577 0.245 27.325)",
      themeCard: "oklch(1 0 0)",
      themeCardForeground: "oklch(0.17 0.02 25)",
    },
  },
];

function PresetThemes({
  onPresetApply,
}: {
  onPresetApply: (colors: Record<string, string>) => void;
}) {
  const [selected, setSelected] = React.useState<string | null>(null);

  function applyPreset(preset: (typeof THEME_PRESETS)[number]) {
    setSelected(preset.name);
    onPresetApply(preset.colors);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {THEME_PRESETS.map((preset) => {
        const p = preset.colors;
        return (
          <button
            key={preset.name}
            type="button"
            onClick={() => applyPreset(preset)}
            className={`group rounded-lg border-2 p-3 text-left transition-all hover:shadow-md ${
              selected === preset.name
                ? "border-primary ring-2 ring-primary/20"
                : "border-transparent hover:border-border"
            }`}
          >
            <div className="mb-2 flex gap-1">
              <div className="size-6 rounded-full border" style={{ backgroundColor: oklchToHexSimple(p.themePrimary) }} />
              <div className="size-6 rounded-full border" style={{ backgroundColor: oklchToHexSimple(p.themeSecondary) }} />
              <div className="size-6 rounded-full border" style={{ backgroundColor: oklchToHexSimple(p.themeAccent) }} />
              <div className="size-6 rounded-full border" style={{ backgroundColor: oklchToHexSimple(p.themeBackground) }} />
            </div>
            <p className="text-sm font-medium">{preset.name}</p>
            <p className="text-xs text-muted-foreground">{preset.description}</p>
          </button>
        );
      })}
    </div>
  );
}

function oklchToHexSimple(oklchStr: string): string {
  try {
    const match = oklchStr.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
    if (!match) return "#888888";
    const l = parseFloat(match[1]);
    const c = parseFloat(match[2]);
    const h = parseFloat(match[3]);
    const hue = (h * Math.PI) / 180;
    const a = c * Math.cos(hue);
    const b = c * Math.sin(hue);
    const lAdj = l + 0.3963 * a + 0.2158 * b;
    const mAdj = l - 0.1055 * a - 0.0639 * b;
    const sAdj = l - 0.0895 * a - 1.2914 * b;
    const l_ = lAdj * lAdj * lAdj;
    const m_ = mAdj * mAdj * mAdj;
    const s_ = sAdj * sAdj * sAdj;
    const r = Math.round(255 * Math.max(0, Math.min(1, +4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_)));
    const g = Math.round(255 * Math.max(0, Math.min(1, -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_)));
    const b2 = Math.round(255 * Math.max(0, Math.min(1, -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_)));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b2.toString(16).padStart(2, "0")}`;
  } catch {
    return "#888888";
  }
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

interface AiModel {
  id: string;
  name: string;
  ownedBy?: string;
  created?: number;
  contextWindow?: number;
  maxOutputTokens?: number;
  description?: string;
  capabilities?: string[];
}

function AiConfigSection({ initial }: { initial: Record<SettingKey, string> }) {
  const [provider, setProvider] = React.useState(initial.aiProvider || "openai");
  const [apiKey, setApiKey] = React.useState(initial.aiApiKey || "");
  const [models, setModels] = React.useState<AiModel[]>([]);
  const [modelsLoading, setModelsLoading] = React.useState(false);
  const [modelsError, setModelsError] = React.useState<string | null>(null);
  const [usage, setUsage] = React.useState<string | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchModelsAndUsage = React.useCallback(
    async (prov: string, key: string, url: string) => {
      if (!key) {
        setModels([]);
        setUsage(null);
        setModelsError(null);
        return;
      }
      setModelsLoading(true);
      setModelsError(null);
      try {
        const [modelsRes, usageRes] = await Promise.allSettled([
          fetch("/api/ai/models", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provider: prov, apiKey: key, baseUrl: url }),
          }).then((r) => r.json()),
          fetch("/api/ai/usage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provider: prov, apiKey: key }),
          }).then((r) => r.json()),
        ]);
        if (modelsRes.status === "fulfilled") {
          if (modelsRes.value.error) {
            setModelsError(modelsRes.value.error);
            setModels([]);
          } else {
            setModels(modelsRes.value.models || []);
          }
        }
        if (usageRes.status === "fulfilled") {
          if (usageRes.value.error) {
            setUsage(`Error: ${usageRes.value.error}`);
          } else {
            setUsage(usageRes.value.billing || "Connected");
          }
        }
      } catch {
        setModelsError("Failed to connect");
      } finally {
        setModelsLoading(false);
      }
    },
    []
  );

  const baseUrlValue = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchModelsAndUsage(provider, apiKey, baseUrlValue.current?.value ?? "");
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [provider, apiKey, fetchModelsAndUsage]);

  const providerHints: Record<string, string> = {
    openai: "Works with OpenAI, OpenRouter, Together, Groq, DeepSeek, Fireworks, Novita, and any OpenAI-compatible API.",
    anthropic: "Direct Anthropic API. For OpenRouter use OpenAI-compatible above.",
    google: "Google AI Studio / Vertex AI (Gemini models).",
    custom: "Any custom API endpoint. Uses OpenAI-compatible /v1/chat/completions format. Paste your full base URL above and enter the model name exactly as your provider expects.",
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="s-aiChatEnabled">Enable chatbot</Label>
          <Select name="aiChatEnabled" defaultValue={initial.aiChatEnabled}>
            <SelectTrigger className="w-full" id="s-aiChatEnabled">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Enabled</SelectItem>
              <SelectItem value="false">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-aiProvider">Provider Type</Label>
          <Select
            name="aiProvider"
            defaultValue={initial.aiProvider}
            onValueChange={(v) => setProvider(v)}
          >
            <SelectTrigger className="w-full" id="s-aiProvider">
              <SelectValue placeholder="Select provider..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI-compatible</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="google">Google Gemini</SelectItem>
              <SelectItem value="custom">Custom (any endpoint)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{providerHints[provider]}</p>
        </div>
      </div>

      {/* Base URL */}
      <div className="space-y-1.5">
        <Label htmlFor="s-aiBaseUrl">Base URL</Label>
        <input
          type="text"
          name="aiBaseUrl"
          id="s-aiBaseUrl"
          ref={baseUrlValue}
          defaultValue={initial.aiBaseUrl}
          placeholder={
            provider === "custom"
              ? "https://your-provider.com/api/v1"
              : provider === "openai"
                ? "https://openrouter.ai/api/v1"
                : provider === "anthropic"
                  ? "https://api.anthropic.com"
                  : "https://generativelanguage.googleapis.com/v1beta"
          }
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
        />
        <p className="text-xs text-muted-defaults">
          {provider === "openai" && "Default: OpenAI. Paste any OpenAI-compatible endpoint (OpenRouter, Together, Groq, DeepSeek, etc.)"}
          {provider === "anthropic" && "Default: https://api.anthropic.com"}
          {provider === "google" && "Default: Google AI Studio. Use Vertex AI endpoint for enterprise."}
          {provider === "custom" && "Must accept POST /chat/completions in OpenAI format. Include the full path if needed."}
        </p>
      </div>

      {/* API Key with live status */}
      <div className="space-y-1.5">
        <Label htmlFor="s-aiApiKey">API Key</Label>
        <div className="flex items-center gap-2">
          <input
            type="password"
            name="aiApiKey"
            id="s-aiApiKey"
            defaultValue={initial.aiApiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              provider === "anthropic"
                ? "sk-ant-..."
                : provider === "custom"
                  ? "API key from your provider"
                  : provider === "google"
                    ? "AIza..."
                    : "sk-..."
            }
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm font-mono"
          />
          {apiKey && (
            <span className="shrink-0">
              {modelsLoading ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : modelsError ? (
                <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                  Invalid
                </span>
              ) : models.length > 0 || usage ? (
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
                  Valid
                </span>
              ) : null}
            </span>
          )}
        </div>
        {usage && !modelsError && (
          <p className="text-xs text-muted-foreground">{usage}</p>
        )}
        {modelsError && (
          <p className="text-xs text-destructive">{modelsError}</p>
        )}
      </div>

      {/* Model — dropdown when models fetched, text input otherwise */}
      <div className="space-y-1.5">
        <Label htmlFor="s-aiModel">Model</Label>
        {models.length > 0 ? (
          <select
            name="aiModel"
            id="s-aiModel"
            defaultValue={initial.aiModel}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.contextWindow ? ` · ${Math.round(m.contextWindow / 1000)}k ctx` : ""}
                {m.maxOutputTokens ? ` · ${Math.round(m.maxOutputTokens / 1000)}k out` : ""}
                {m.ownedBy ? ` (${m.ownedBy})` : ""}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            name="aiModel"
            id="s-aiModel"
            defaultValue={initial.aiModel}
            placeholder={
              provider === "openai" || provider === "custom"
                ? "e.g. gpt-4o-mini"
                : provider === "anthropic"
                  ? "e.g. claude-sonnet-4-20250514"
                  : "e.g. gemini-2.0-flash"
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
          />
        )}
        {modelsLoading && (
          <p className="text-xs text-muted-foreground">Fetching models…</p>
        )}
        {models.length > 0 && (
          <div className="rounded-md border bg-muted/50 p-3 text-xs space-y-2 max-h-48 overflow-y-auto">
            {models.map((m) => {
              const isSelected = m.id === initial.aiModel;
              return (
                <div key={m.id} className={`flex items-start justify-between gap-3 ${isSelected ? "font-semibold" : ""}`}>
                  <span className="font-mono shrink-0">{m.name}</span>
                  <span className="text-muted-foreground text-right shrink-0 flex gap-2">
                    {m.contextWindow ? <span>{Math.round(m.contextWindow / 1000)}k ctx</span> : null}
                    {m.maxOutputTokens ? <span>{Math.round(m.maxOutputTokens / 1000)}k out</span> : null}
                    {m.ownedBy ? <span className="opacity-60">{m.ownedBy}</span> : null}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TextareaField
        label="Custom system prompt (optional)"
        name="aiSystemPrompt"
        value={initial.aiSystemPrompt}
        rows={4}
      />
    </div>
  );
}
