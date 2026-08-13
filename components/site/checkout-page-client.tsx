"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { completeStoreCheckout, getStoreCart, getStorePaymentMethods, setStoreCartEmail } from "@/lib/actions/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { notifyCartChanged } from "@/components/site/cart-provider";

type Cart = Awaited<ReturnType<typeof getStoreCart>>;
type PaymentMethod = Awaited<ReturnType<typeof getStorePaymentMethods>>[number];

export function CheckoutPageClient({ siteSlug }: { siteSlug?: string | null }) {
  const [cart, setCart] = React.useState<Cart | null>(null);
  const [methods, setMethods] = React.useState<PaymentMethod[]>([]);
  const [provider, setProvider] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [complete, setComplete] = React.useState<string | null>(null);
  const homeHref = siteSlug ? `/?site=${encodeURIComponent(siteSlug)}` : "/";
  const selectedMethod = methods.find((method) => method.id === provider);

  React.useEffect(() => {
    let active = true;
    async function run() {
      try {
        const [nextCart, nextMethods] = await Promise.all([
          getStoreCart(window.localStorage.getItem("store-cart-token")),
          getStorePaymentMethods(),
        ]);
        if (!active) return;
        setCart(nextCart);
        setMethods(nextMethods);
        setProvider((current) => current || nextMethods[0]?.id || "");
      } catch {
        toast.error("Unable to load checkout.");
      }
    }
    void run();
    return () => { active = false; };
  }, []);

  function submit(formData: FormData) {
    const token = window.localStorage.getItem("store-cart-token");
    if (!token) return;

    // Stripe Checkout redirect
    if (provider === "stripe") {
      startTransition(async () => {
        try {
          const res = await fetch("/api/payments/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, customer: Object.fromEntries(formData.entries()) }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Failed to start checkout.");
          window.localStorage.removeItem("store-cart-token");
          notifyCartChanged();
          window.location.href = data.url;
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Unable to start Stripe checkout.");
        }
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await completeStoreCheckout(token, formData);
        window.localStorage.removeItem("store-cart-token");
        notifyCartChanged();
        if (result.provider === "esewa") {
          window.location.assign(`/api/payments/esewa/initiate?order=${encodeURIComponent(result.orderNumber)}`);
          return;
        }
        setComplete(result.orderNumber);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to complete your order.");
      }
    });
  }

  if (!cart) return <div className="mx-auto max-w-6xl px-4 py-12"><div className="space-y-6"><div className="h-8 w-48 animate-pulse rounded bg-muted" /><div className="grid gap-8 lg:grid-cols-[1fr_20rem]"><div className="space-y-6">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="rounded-xl border p-5"><div className="mb-4 h-5 w-32 animate-pulse rounded bg-muted" /><div className="space-y-3">{Array.from({ length: 2 }).map((_, j) => <div key={j} className="h-10 animate-pulse rounded bg-muted" />)}</div></div>)}</div><div className="h-64 animate-pulse rounded-xl bg-muted" /></div></div></div>;
  if (complete) return <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center"><CheckCircle2 className="size-12 text-primary" /><h1 className="font-heading text-3xl font-semibold">Order confirmed</h1><p className="text-muted-foreground">Thanks for your order. Your reference is <strong>{complete}</strong>.</p><Button asChild><Link href={homeHref}>Continue shopping</Link></Button></div>;
  if (cart.items.length === 0) return <div className="mx-auto max-w-lg px-4 py-24 text-center"><h1 className="font-heading text-3xl font-semibold">Your cart is empty</h1><Button asChild className="mt-5"><Link href={homeHref}>Continue shopping</Link></Button></div>;

  return (
    <form action={submit} className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-8">
        <div><p className="text-sm font-medium text-primary">Secure checkout</p><h1 className="mt-1 font-heading text-3xl font-semibold">Complete your order</h1></div>
        <section className="rounded-xl border p-5">
          <h2 className="font-heading text-lg font-semibold">Contact</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field id="customerName" label="Full name" autoComplete="name" required />
            <Field id="email" label="Email address" type="email" autoComplete="email" required onBlur={(email) => { const token = window.localStorage.getItem("store-cart-token"); if (token) void setStoreCartEmail(token, email); }} />
            <Field id="phone" label="Phone" type="tel" autoComplete="tel" required />
          </div>
        </section>
        <section className="rounded-xl border p-5">
          <h2 className="font-heading text-lg font-semibold">Delivery address</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field id="addressLine1" label="Address line 1" autoComplete="address-line1" required /></div>
            <div className="sm:col-span-2"><Field id="addressLine2" label="Address line 2" autoComplete="address-line2" /></div>
            <Field id="city" label="City" autoComplete="address-level2" required />
            <Field id="state" label="State / region" autoComplete="address-level1" />
            <Field id="postalCode" label="Postal code" autoComplete="postal-code" />
            <Field id="country" label="Country" autoComplete="country-name" required defaultValue="Nepal" />
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="deliveryNotes">Delivery notes</Label><Textarea id="deliveryNotes" name="deliveryNotes" rows={3} placeholder="Landmark, preferred delivery time, or special instructions" /></div>
          </div>
        </section>
        <section className="rounded-xl border p-5">
          <h2 className="font-heading text-lg font-semibold">Payment method</h2>
          {methods.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No payment methods are available. Please contact the store.</p> : <div className="mt-4 space-y-3">{methods.map((method) => <label key={method.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5"><input type="radio" name="provider" value={method.id} checked={provider === method.id} onChange={() => setProvider(method.id)} required /><span className="font-medium">{method.label}</span><span className="ml-auto text-xs text-muted-foreground">{method.id === "qr" ? "Manual review" : method.id === "cod" ? "Pay on delivery" : "Payment pending"}</span></label>)}</div>}
          {selectedMethod?.id === "qr" && <div className="mt-5 rounded-lg bg-muted/50 p-4"><p className="font-medium">Pay using this QR code</p>{selectedMethod.qrImage && <>
            {/* Tenant-configured QR URLs are not limited to Next.js image hosts. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedMethod.qrImage} alt="Payment QR code" className="mt-3 size-48 rounded-md bg-background object-contain" />
          </>}{selectedMethod.instructions && <p className="mt-3 text-sm text-muted-foreground">{selectedMethod.instructions}</p>}<div className="mt-4 space-y-2"><Label htmlFor="paymentReference">Payment reference number</Label><Input id="paymentReference" name="paymentReference" required placeholder="Enter the transaction reference" /></div></div>}
          {selectedMethod?.id === "cod" && selectedMethod.instructions && <div className="mt-5 rounded-lg bg-muted/50 p-4"><p className="font-medium">Cash on delivery instructions</p><p className="mt-2 text-sm text-muted-foreground">{selectedMethod.instructions}</p></div>}
        </section>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><LockKeyhole className="size-4" />{selectedMethod?.id === "qr" ? "QR payments are marked pending until the store verifies the reference." : selectedMethod?.id === "cod" ? "Payment will be collected when your order is delivered." : "This order remains pending until the configured payment provider confirms it."}</div>
      </div>
      <aside className="h-fit rounded-xl border bg-muted/20 p-5">
        <h2 className="font-heading text-lg font-semibold">Order summary</h2>
        <div className="mt-4 space-y-3 text-sm">{cart.items.map((item) => <div key={item.id} className="flex justify-between gap-3"><span>{item.title}<SelectedOptions value={item.selectedOptions} /><span className="block text-muted-foreground">Qty {item.quantity}</span></span><span>{formatPrice(item.price * item.quantity, cart.currency)}</span></div>)}</div>
        <div className="mt-4 space-y-2 border-t pt-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(cart.subtotal, cart.currency)}</span></div>{cart.discountAmount > 0 && <div className="flex justify-between text-primary"><span>Discount ({cart.promotion?.code})</span><span>-{formatPrice(cart.discountAmount, cart.currency)}</span></div>}<div className="flex justify-between"><span className="text-muted-foreground">{cart.shippingName}</span><span>{cart.shippingAmount ? formatPrice(cart.shippingAmount, cart.currency) : "Free"}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatPrice(cart.taxAmount, cart.currency)}</span></div><div className="flex justify-between border-t pt-3 text-base font-semibold"><span>Total</span><span>{formatPrice(cart.total, cart.currency)}</span></div></div>
        <Button type="submit" className="mt-5 w-full" disabled={pending || !provider}>{pending && <Loader2 className="mr-2 size-4 animate-spin" />}{selectedMethod?.id === "qr" ? "Submit payment reference" : selectedMethod?.id === "cod" ? "Place cash on delivery order" : "Place order"}</Button>
      </aside>
    </form>
  );
}

function Field({ id, label, type = "text", required = false, autoComplete, defaultValue, onBlur }: { id: string; label: string; type?: string; required?: boolean; autoComplete?: string; defaultValue?: string; onBlur?: (value: string) => void }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} name={id} type={type} required={required} autoComplete={autoComplete} defaultValue={defaultValue} onBlur={(event) => onBlur?.(event.currentTarget.value)} /></div>;
}

function SelectedOptions({ value }: { value: string }) {
  const options = parseSelectedOptions(value);
  if (options.length === 0) return null;
  return <span className="mt-0.5 block text-xs text-muted-foreground">{options.join(" / ")}</span>;
}

function parseSelectedOptions(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.entries(parsed).flatMap(([key, option]) => typeof option === "string" && option ? [`${titleCase(key)}: ${option}`] : []);
  } catch { return []; }
}

function titleCase(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function formatPrice(price: number, currency: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(price / 100); }
