"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import type { Product as CatalogProduct } from "@/lib/db/schema";
import { AddToCartButton } from "@/components/site/add-to-cart-button";
import { ProductGridFilters } from "@/components/site/blocks/product-grid-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function parseConfig(raw: string | null): Record<string, unknown> {
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
  slug?: string;
  inventoryQuantity?: number;
  category?: string;
  amount?: number;
  currency?: string;
}

function parseProducts(raw: unknown): Product[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((item): item is Product => typeof item === "object" && item !== null && "name" in item && "price" in item);
  if (typeof raw !== "string") return [];
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
  const source = c.source === "all" ? "all" : "featured";
  const showFilters = c.showFilters === true || c.showFilters === "true" || (source === "all" && c.showFilters !== "false");
  const configuredLimit = Number(c.limit);
  const productLimit = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : source === "featured" ? 4 : 0;
  const sourceCatalogProducts = source === "all" ? catalogProducts : catalogProducts.filter((product) => product.featured);
  const displayedCatalogProducts = productLimit > 0 ? sourceCatalogProducts.slice(0, productLimit) : sourceCatalogProducts;
  const products: Product[] = catalogProducts.length > 0
    ? displayedCatalogProducts.map((product) => ({
      name: product.title,
      price: formatPrice(product.price, product.currency),
      image: product.image ?? undefined,
      description: product.description ?? undefined,
      badge: product.featured ? "Featured" : undefined,
      link: undefined,
      id: product.id,
      slug: product.slug,
      inventoryQuantity: product.inventoryQuantity,
      category: product.category ?? undefined,
      amount: product.price,
      currency: product.currency,
    }))
    : configuredProducts;
  const columns = String(c.columns || "3");
  const [category, setCategory] = React.useState("all");
  const [minPrice, setMinPrice] = React.useState("");
  const [maxPrice, setMaxPrice] = React.useState("");
  const [sort, setSort] = React.useState("latest");
  const siteSlug = useSearchParams().get("site");
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))] as string[];
  const filteredProducts = products.filter((product) => (category === "all" || product.category === category) && (!minPrice || !product.amount || product.amount >= Number(minPrice) * 100) && (!maxPrice || !product.amount || product.amount <= Number(maxPrice) * 100)).sort((a, b) => sort === "low" ? (a.amount ?? 0) - (b.amount ?? 0) : sort === "high" ? (b.amount ?? 0) - (a.amount ?? 0) : 0);
  const productHref = (product: Product) => {
    if (product.slug) {
      const path = `/products/${product.slug}`;
      return siteSlug ? `${path}?site=${encodeURIComponent(siteSlug)}` : path;
    }
    return product.link;
  };

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
      {showFilters && products.length > 0 && (
        <ProductGridFilters
          categories={categories}
          category={category}
          minPrice={minPrice}
          maxPrice={maxPrice}
          sort={sort}
          onCategoryChange={setCategory}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          onSortChange={setSort}
        />
      )}
      {filteredProducts.length > 0 ? (
        <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-${columns}`}>
          {filteredProducts.map((product, i) => (
            <Card key={i} className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
              {product.image && (
                <Link href={productHref(product) ?? "#"} className="relative block aspect-square overflow-hidden" aria-label={`View ${product.name}`}>
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
                </Link>
              )}
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading font-semibold">
                    {productHref(product) ? <Link href={productHref(product)!} className="hover:text-primary">{product.name}</Link> : product.name}
                  </h3>
                  <span className="shrink-0 font-semibold text-primary">{product.price}</span>
                </div>
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {product.id ? <AddToCartButton productId={product.id} available={(product.inventoryQuantity ?? 0) > 0} /> : null}
                  {productHref(product) ? <Button size="sm" variant="ghost" asChild><Link href={productHref(product)!}>View details</Link></Button> : product.link ? <Button size="sm" variant="outline" className="gap-2" asChild><a href={product.link}><ShoppingCart className="size-4" />View product</a></Button> : null}
                </div>
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
