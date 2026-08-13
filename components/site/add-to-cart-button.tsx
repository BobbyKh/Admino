"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { addStoreCartItem } from "@/lib/actions/index";
import { Button } from "@/components/ui/button";
import { notifyCartChanged } from "@/components/site/cart-provider";

export function AddToCartButton({ productId, available, selectedOptions, quantity = 1 }: { productId: number; available: boolean; selectedOptions?: Record<string, string>; quantity?: number }) {
  const [pending, startTransition] = React.useTransition();
  const siteSlug = useSearchParams().get("site");
  const cartHref = siteSlug ? `/cart?site=${encodeURIComponent(siteSlug)}` : "/cart";

  function addToCart() {
    startTransition(async () => {
      try {
        const result = await addStoreCartItem(window.localStorage.getItem("store-cart-token"), productId, selectedOptions, quantity);
        window.localStorage.setItem("store-cart-token", result.token);
        notifyCartChanged();
        toast.success("Added to cart.", { action: { label: "View cart", onClick: () => window.location.assign(cartHref) } });
      } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to add to cart."); }
    });
  }

  return <Button size="sm" variant="outline" className="gap-2" disabled={!available || pending} onClick={addToCart}><ShoppingCart className="size-4" />{available ? (pending ? "Adding..." : "Add to cart") : "Out of stock"}</Button>;
}
