"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { addStoreCartItem } from "@/lib/actions/index";
import { Button } from "@/components/ui/button";

export function AddToCartButton({ productId, available }: { productId: number; available: boolean }) {
  const [pending, startTransition] = React.useTransition();
  const siteSlug = useSearchParams().get("site");
  const cartHref = siteSlug ? `/cart?site=${encodeURIComponent(siteSlug)}` : "/cart";

  function addToCart() {
    startTransition(async () => {
      try {
        const result = await addStoreCartItem(window.localStorage.getItem("store-cart-token"), productId);
        window.localStorage.setItem("store-cart-token", result.token);
        toast.success("Added to cart.", { action: { label: "View cart", onClick: () => window.location.assign(cartHref) } });
      } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to add to cart."); }
    });
  }

  return <Button size="sm" variant="outline" className="gap-2" disabled={!available || pending} onClick={addToCart}><ShoppingCart className="size-4" />{available ? (pending ? "Adding..." : "Add to cart") : "Out of stock"}</Button>;
}
