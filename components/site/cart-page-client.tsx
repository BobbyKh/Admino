"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getStoreCart, updateStoreCartItem } from "@/lib/actions/index";
import { Button } from "@/components/ui/button";

type Cart = Awaited<ReturnType<typeof getStoreCart>>;

export function CartPageClient({ siteSlug }: { siteSlug?: string | null }) {
  const [cart, setCart] = React.useState<Cart | null>(null);
  const [pendingId, setPendingId] = React.useState<number | null>(null);
  const cartToken = typeof window === "undefined" ? null : window.localStorage.getItem("store-cart-token");
  const checkoutHref = siteSlug ? `/checkout?site=${encodeURIComponent(siteSlug)}` : "/checkout";

  const loadCart = React.useEffectEvent(async () => {
    try { setCart(await getStoreCart(window.localStorage.getItem("store-cart-token"))); }
    catch { toast.error("Unable to load your cart."); }
  });

  React.useEffect(() => { void loadCart(); }, []);

  async function update(productId: number, quantity: number) {
    if (!cartToken) return;
    setPendingId(productId);
    try { await updateStoreCartItem(cartToken, productId, quantity); await loadCart(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update cart."); }
    finally { setPendingId(null); }
  }

  if (!cart) return <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin" /></div>;
  if (cart.items.length === 0) return <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center"><ShoppingBag className="size-10 text-muted-foreground" /><h1 className="font-heading text-3xl font-semibold">Your cart is empty</h1><p className="text-muted-foreground">Add products from the shop to continue.</p><Button asChild><Link href={siteSlug ? `/?site=${encodeURIComponent(siteSlug)}` : "/"}>Continue shopping</Link></Button></div>;

  return <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_20rem]"><div><h1 className="font-heading text-3xl font-semibold">Your cart</h1><div className="mt-6 divide-y rounded-xl border">{cart.items.map((item) => <div key={item.id} className="flex gap-4 p-4"><div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">{item.image && <img src={item.image} alt="" className="size-full object-cover" />}</div><div className="min-w-0 flex-1"><p className="font-medium">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{formatPrice(item.price, cart.currency)}</p><div className="mt-3 flex items-center gap-2"><Button size="icon-xs" variant="outline" disabled={pendingId === item.productId || item.quantity === 1} onClick={() => update(item.productId, item.quantity - 1)} aria-label={`Decrease ${item.title} quantity`}><Minus /></Button><span className="w-6 text-center text-sm">{item.quantity}</span><Button size="icon-xs" variant="outline" disabled={pendingId === item.productId || item.quantity >= item.inventoryQuantity} onClick={() => update(item.productId, item.quantity + 1)} aria-label={`Increase ${item.title} quantity`}><Plus /></Button><Button size="icon-xs" variant="ghost" className="ml-2 text-destructive" disabled={pendingId === item.productId} onClick={() => update(item.productId, 0)} aria-label={`Remove ${item.title}`}><Trash2 /></Button></div></div><p className="font-medium">{formatPrice(item.price * item.quantity, cart.currency)}</p></div>)}</div></div><aside className="h-fit rounded-xl border bg-muted/20 p-5"><h2 className="font-heading text-lg font-semibold">Order summary</h2><div className="mt-4 flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(cart.subtotal, cart.currency)}</span></div><div className="mt-4 border-t pt-4"><div className="flex justify-between font-semibold"><span>Total</span><span>{formatPrice(cart.subtotal, cart.currency)}</span></div><Button asChild className="mt-5 w-full"><Link href={checkoutHref}>Checkout</Link></Button></div></aside></div>;
}

function formatPrice(price: number, currency: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(price / 100); }
