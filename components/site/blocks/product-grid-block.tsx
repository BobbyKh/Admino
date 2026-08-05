"use client";

import * as React from "react";
import { ShoppingCart } from "lucide-react";
import type { Product as CatalogProduct } from "@/lib/db/schema";
import { AddToCartButton } from "@/components/site/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

interface Product {
  name: string;
  price: string;
  image?: string;
  description?: string;
  badge?: string;
  link?: string;
  id?: number;
  inventoryQuantity?: number;
  category?: string;
  amount?: number;
  currency?: string;
}

function parseProducts(raw: string | null): Product[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function ProductGridBlock({ config, products: catalogProducts }: { config: string | null; products: CatalogProduct[] }) {
  const c = parseConfig(config);
  const configuredProducts = parseProducts(c.items);
  const products: Product[] = catalogProducts.length > 0
    ? catalogProducts.map((product) => ({
      name: product.title,
      price: formatPrice(product.price, product.currency),
      image: product.image ?? undefined,
      description: product.description ?? undefined,
      badge: product.featured ? "Featured" : undefined,
      link: undefined,
      id: product.id,
      inventoryQuantity: product.inventoryQuantity,
      category: product.category ?? undefined,
      amount: product.price,
      currency: product.currency,
    }))
    : configuredProducts;
  const columns = c.columns || "3";
  const [category, setCategory] = React.useState("all");
  const [minPrice, setMinPrice] = React.useState("");
  const [maxPrice, setMaxPrice] = React.useState("");
  const [sort, setSort] = React.useState("latest");
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))] as string[];
  const filteredProducts = products.filter((product) => (category === "all" || product.category === category) && (!minPrice || !product.amount || product.amount >= Number(minPrice) * 100) && (!maxPrice || !product.amount || product.amount <= Number(maxPrice) * 100)).sort((a, b) => sort === "low" ? (a.amount ?? 0) - (b.amount ?? 0) : sort === "high" ? (b.amount ?? 0) - (a.amount ?? 0) : 0);

  return (
    <section id="shop" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        {c.badge && <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">{c.badge}</p>}
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
          {c.title || "Our Products"}
        </h2>
        {c.subtitle && (
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{c.subtitle}</p>
        )}
      </div>
      {catalogProducts.length > 0 && <div className="mb-8 grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-4"><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm"><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select><input value={minPrice} onChange={(event) => setMinPrice(event.target.value)} type="number" min="0" placeholder="Min price" className="rounded-lg border bg-background px-3 py-2 text-sm" /><input value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} type="number" min="0" placeholder="Max price" className="rounded-lg border bg-background px-3 py-2 text-sm" /><select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm"><option value="latest">Latest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></div>}
      {filteredProducts.length > 0 ? (
        <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-${columns}`}>
          {filteredProducts.map((product, i) => (
            <Card key={i} className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
              {product.image && (
                <div className="relative aspect-square overflow-hidden">
                  {/* Product images may come from any tenant media host. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {product.badge && (
                    <Badge className="absolute left-3 top-3">{product.badge}</Badge>
                  )}
                </div>
              )}
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading font-semibold">{product.name}</h3>
                  <span className="shrink-0 font-semibold text-primary">{product.price}</span>
                </div>
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                )}
                {product.id ? <AddToCartButton productId={product.id} available={(product.inventoryQuantity ?? 0) > 0} /> : product.link ? <Button size="sm" variant="outline" className="gap-2" asChild><a href={product.link}><ShoppingCart className="size-4" />View product</a></Button> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          No products match these filters. Try a different category or price range.
        </p>
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
