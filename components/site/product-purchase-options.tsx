"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/site/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WholesaleTier } from "@/lib/commerce/pricing";

export function ProductPurchaseOptions({ productId, available, inventoryQuantity, sizes, colors, wholesaleTiers, currency }: { productId: number; available: boolean; inventoryQuantity: number; sizes: string[]; colors: string[]; wholesaleTiers: WholesaleTier[]; currency: string }) {
  const [size, setSize] = React.useState(sizes[0] ?? "");
  const [color, setColor] = React.useState(colors[0] ?? "");
  const [quantity, setQuantity] = React.useState(1);
  const selectedOptions = {
    ...(size ? { size } : {}),
    ...(color ? { color } : {}),
  };

  return (
    <div className="space-y-5">
      {(sizes.length > 0 || colors.length > 0) && (
        <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
          {sizes.length > 0 && <OptionPicker label="Size" options={sizes} value={size} onChange={setSize} />}
          {colors.length > 0 && <OptionPicker label="Color" options={colors} value={color} onChange={setColor} />}
        </div>
      )}
      {wholesaleTiers.length > 0 && <div className="overflow-hidden rounded-xl border"><div className="bg-muted/40 px-4 py-3"><p className="font-medium">Wholesale pricing</p><p className="text-xs text-muted-foreground">Unit price automatically decreases at these quantities.</p></div><div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">{wholesaleTiers.map((tier) => <div key={tier.minQuantity} className="p-3 text-sm"><p className="font-semibold">{formatPrice(tier.unitPrice, currency)} each</p><p className="text-muted-foreground">{tier.minQuantity}+ units</p></div>)}</div></div>}
      <div className="flex flex-wrap items-end gap-3"><div className="space-y-2"><label htmlFor="purchase-quantity" className="text-sm font-medium">Quantity</label><div className="flex items-center"><Button type="button" variant="outline" size="icon" className="rounded-r-none" disabled={quantity === 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>-</Button><Input id="purchase-quantity" type="number" min={1} max={inventoryQuantity} value={quantity} onChange={(event) => setQuantity(Math.min(inventoryQuantity, Math.max(1, Number(event.target.value) || 1)))} className="w-20 rounded-none text-center" /><Button type="button" variant="outline" size="icon" className="rounded-l-none" disabled={quantity >= inventoryQuantity} onClick={() => setQuantity((value) => Math.min(inventoryQuantity, value + 1))}>+</Button></div></div><AddToCartButton productId={productId} available={available} selectedOptions={selectedOptions} quantity={quantity} /></div>
    </div>
  );
}

function formatPrice(price: number, currency: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(price / 100); }

function OptionPicker({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option} type="button" onClick={() => onChange(option)} className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <Badge variant={value === option ? "default" : "outline"}>{option}</Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
