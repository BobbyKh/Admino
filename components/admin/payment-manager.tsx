"use client";

import * as React from "react";
import { CreditCard, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createPaymentConfiguration, deletePaymentConfiguration, updatePaymentConfiguration } from "@/lib/actions/index";
import { TEST_PAYMENT_PROVIDERS, testPaymentProviderRegistry, type TestPaymentProvider } from "@/lib/commerce/providers";
import type { PaymentConfiguration } from "@/lib/db/schema";
import { MediaPicker } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type PaymentSecretStatus = Partial<Record<TestPaymentProvider, { fields: string[]; unreadable: boolean }>>;

export function PaymentManager({ configurations, secretStatus }: { configurations: PaymentConfiguration[]; secretStatus: PaymentSecretStatus }) {
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Payment configurations</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure tenant checkout methods. eSewa can run in test or live mode; QR remains manual verification.</p>
      </div>
      <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20">
        <CardContent className="p-4 text-sm text-amber-900 dark:text-amber-200">
          <strong>Launch note:</strong> Live eSewa marks orders paid only after a signed callback matches the order number, merchant code, amount, and signature. Refunds and disputes still require merchant-side handling.
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <CreditCard className="size-4 text-primary" />
          <div>
            <CardTitle className="font-heading">Payment methods</CardTitle>
            <CardDescription>Only enabled methods appear at checkout. Saved secret values are encrypted and never shown again.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {TEST_PAYMENT_PROVIDERS.map((provider) => (
            <ProviderForm
              key={provider}
              provider={provider}
              configuration={configurations.find((item) => item.provider === provider)}
              savedSecrets={secretStatus[provider]?.fields ?? []}
              secretsUnreadable={secretStatus[provider]?.unreadable ?? false}
              pending={pending}
              startTransition={startTransition}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ProviderForm({ provider, configuration, savedSecrets, secretsUnreadable, pending, startTransition }: { provider: TestPaymentProvider; configuration?: PaymentConfiguration; savedSecrets: string[]; secretsUnreadable: boolean; pending: boolean; startTransition: React.TransitionStartFunction }) {
  const registry = testPaymentProviderRegistry[provider];
  const save = configuration ? updatePaymentConfiguration.bind(null, provider) : createPaymentConfiguration;
  const settings = parseSettings(configuration?.settings);
  const [qrImage, setQrImage] = React.useState(settings.qrImage);
  const hasSecret = (name: string) => savedSecrets.includes(name);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          try {
            await save(new FormData(event.currentTarget));
            toast.success(`${registry.label} configuration saved.`);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to save configuration.");
          }
        });
      }}
      className="rounded-lg border p-4"
    >
      <input type="hidden" name="provider" value={provider} />
      {secretsUnreadable && <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">Saved credentials cannot be decrypted. Re-enter every secret field and save, or remove this payment method and configure it again.</div>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{registry.label}</p>
          <p className="text-sm text-muted-foreground">{registry.description}</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium"><input name="enabled" type="checkbox" defaultChecked={configuration?.enabled} /> Enabled</label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Merchant reference" name="testReference" defaultValue={configuration?.accountId ?? ""} placeholder="Merchant account label" />
        {provider === "esewa" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="mode-esewa">Mode</Label>
              <select id="mode-esewa" name="mode" defaultValue={settings.mode} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="test">Test / RC endpoint</option>
                <option value="live">Live production endpoint</option>
              </select>
            </div>
            <Field label="Merchant / service code" name="merchantId" defaultValue={settings.merchantId} placeholder="Merchant service code" />
            <Field label="Client ID (public)" name="publicKey" defaultValue={settings.publicKey} placeholder="Public eSewa client ID" />
            <SecretField label="Client secret" name="clientSecret" configured={hasSecret("clientSecret")} />
            <SecretField label="Signing secret key" name="secretKey" configured={hasSecret("secretKey")} />
          </>
        )}
        {provider === "khalti" && <><Field label="Public key" name="publicKey" defaultValue={settings.publicKey} /><SecretField label="Secret key" name="secretKey" configured={hasSecret("secretKey")} /></>}
        {provider === "stripe" && <><Field label="Publishable key" name="publicKey" defaultValue={settings.publicKey} /><SecretField label="Secret key" name="secretKey" configured={hasSecret("secretKey")} /><SecretField label="Webhook secret" name="webhookSecret" configured={hasSecret("webhookSecret")} /></>}
        {provider === "qr" && (
          <>
            <div className="md:col-span-2 rounded-lg border bg-muted/20 p-4"><MediaPicker name="qrImage" label="Payment QR image" value={qrImage} onChange={setQrImage} /></div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="qrInstructions">QR instructions</Label><Textarea id="qrInstructions" name="qrInstructions" defaultValue={settings.qrInstructions} rows={3} /></div>
          </>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button disabled={pending} size="sm">Save {registry.label}</Button>
        {configuration && <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => startTransition(async () => { await deletePaymentConfiguration(provider); toast.success(`${registry.label} removed.`); })}><Trash2 className="mr-1 size-3" />Remove</Button>}
      </div>
    </form>
  );
}

function Field({ label, name, ...props }: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...props} /></div>;
}

function SecretField({ label, name, configured }: { label: string; name: string; configured: boolean }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label} {configured && <span className="text-xs font-normal text-muted-foreground">(saved)</span>}</Label><Input id={name} name={name} type="password" autoComplete="new-password" placeholder={configured ? "Enter to replace" : "Not configured"} /></div>;
}

function parseSettings(raw: string | null | undefined) {
  try {
    const value = JSON.parse(raw ?? "{}") as Record<string, unknown>;
    return {
      mode: value.mode === "live" ? "live" : "test",
      merchantId: typeof value.merchantId === "string" ? value.merchantId : "",
      publicKey: typeof value.publicKey === "string" ? value.publicKey : "",
      qrImage: typeof value.qrImage === "string" ? value.qrImage : "",
      qrInstructions: typeof value.qrInstructions === "string" ? value.qrInstructions : "",
    };
  } catch {
    return { mode: "test", merchantId: "", publicKey: "", qrImage: "", qrInstructions: "" };
  }
}
