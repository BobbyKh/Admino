"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/site/add-to-cart-button";

export function ProductPurchaseOptions({ productId, available, sizes, colors }: { productId: number; available: boolean; sizes: string[]; colors: string[] }) {
  const [size, setSize] = React.useState(sizes[0] ?? "");
  const [color, setColor] = React.useState(colors[0] ?? "");
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
      <AddToCartButton productId={productId} available={available} selectedOptions={selectedOptions} />
    </div>
  );
}

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
