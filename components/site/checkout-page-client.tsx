"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { completeStoreCheckout, getStoreCart, getStorePaymentMethods } from "@/lib/actions/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    startTransition(async () => {
      try {
        const result = await completeStoreCheckout(token, formData);
        window.localStorage.removeItem("store-cart-token");
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

  if (!cart) return <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin" /></div>;
  if (complete) return <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center"><CheckCircle2 className="size-12 text-primary" /><h1 className="font-heading text-3xl font-semibold">Order confirmed</h1><p className="text-muted-foreground">Thanks for your order. Your reference is <strong>{complete}</strong>.</p><Button asChild><Link href={homeHref}>Continue shopping</Link></Button></div>;
  if (cart.items.length === 0) return <div className="mx-auto max-w-lg px-4 py-24 text-center"><h1 className="font-heading text-3xl font-semibold">Your cart is empty</h1><Button asChild className="mt-5"><Link href={homeHref}>Continue shopping</Link></Button></div>;

  return <form action={submit} className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_20rem]">
    <div className="space-y-8">
      <div><p className="text-sm font-medium text-primary">Secure checkout</p><h1 className="mt-1 font-heading text-3xl font-semibold">Complete your order</h1></div>
      <section className="rounded-xl border p-5"><h2 className="font-heading text-lg font-semibold">Contact</h2><div className="mt-4 space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></div></section>
      <section className="rounded-xl border p-5">
        <h2 className="font-heading text-lg font-semibold">Payment method</h2>
        {methods.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No payment methods are available. Please contact the store.</p> : <div className="mt-4 space-y-3">{methods.map((method) => <label key={method.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5"><input type="radio" name="provider" value={method.id} checked={provider === method.id} onChange={() => setProvider(method.id)} required /><span className="font-medium">{method.label}</span><span className="ml-auto text-xs text-muted-foreground">{method.id === "qr" ? "Manual review" : "Payment pending"}</span></label>)}</div>}
        {selectedMethod?.id === "qr" && <div className="mt-5 rounded-lg bg-muted/50 p-4"><p className="font-medium">Pay using this QR code</p>{selectedMethod.qrImage && <img src={selectedMethod.qrImage} alt="Payment QR code" className="mt-3 size-48 rounded-md bg-background object-contain" />}{selectedMethod.instructions && <p className="mt-3 text-sm text-muted-foreground">{selectedMethod.instructions}</p>}<div className="mt-4 space-y-2"><Label htmlFor="paymentReference">Payment reference number</Label><Input id="paymentReference" name="paymentReference" required placeholder="Enter the transaction reference" /></div></div>}
      </section>
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><LockKeyhole className="size-4" />{selectedMethod?.id === "qr" ? "QR payments are marked pending until the store verifies the reference." : "This order remains pending until the configured payment provider confirms it."}</div>
    </div>
    <aside className="h-fit rounded-xl border bg-muted/20 p-5"><h2 className="font-heading text-lg font-semibold">Order summary</h2><div className="mt-4 space-y-3 text-sm">{cart.items.map((item) => <div key={item.id} className="flex justify-between gap-3"><span>{item.title} × {item.quantity}</span><span>{formatPrice(item.price * item.quantity, cart.currency)}</span></div>)}</div><div className="mt-4 flex justify-between border-t pt-4 font-semibold"><span>Total</span><span>{formatPrice(cart.subtotal, cart.currency)}</span></div><Button type="submit" className="mt-5 w-full" disabled={pending || !provider}>{pending && <Loader2 className="mr-2 size-4 animate-spin" />}{selectedMethod?.id === "qr" ? "Submit payment reference" : "Place order"}</Button></aside>
  </form>;
}

function formatPrice(price: number, currency: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(price / 100); }
