"use client";

import * as React from "react";
import { Search } from "lucide-react";
import type { Product } from "@/lib/db/schema";
import { AddToCartButton } from "@/components/site/add-to-cart-button";
import { Input } from "@/components/ui/input";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function SearchBlock({ config, products }: { config: string | null; products: Product[] }) {
  const c = parseConfig(config);
  const [query, setQuery] = React.useState("");
  const deferredQuery = React.useDeferredValue(query.trim().toLowerCase());
  const results = deferredQuery
    ? products.filter((product) => [product.title, product.description, product.category].some((value) => value?.toLowerCase().includes(deferredQuery)))
    : [];

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">{c.title || "Search products"}</h2>
        {c.subtitle && <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{c.subtitle}</p>}
      </div>
      <div className="relative mx-auto mt-8 max-w-2xl">
        <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={c.placeholder || "Search products"}
          aria-label={c.placeholder || "Search products"}
          className="h-12 pl-12 text-base"
        />
      </div>
      {deferredQuery && (
        <div className="mt-8">
          {results.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((product) => (
                <article key={product.id} className="flex gap-4 rounded-xl border p-4">
                  {product.image && (
                    // Product images may come from any tenant media host.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image} alt={product.title} loading="lazy" className="size-20 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-heading font-semibold">{product.title}</h3>
                      <span className="shrink-0 font-semibold text-primary">{formatPrice(product.price, product.currency)}</span>
                    </div>
                    {product.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{product.description}</p>}
                    <div className="mt-3"><AddToCartButton productId={product.id} available={product.inventoryQuantity > 0} /></div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">No products match your search.</p>
          )}
        </div>
      )}
    </section>
  );
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(price / 100);
}
