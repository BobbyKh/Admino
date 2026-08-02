import Image from "next/image";
import { ShoppingCart } from "lucide-react";
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

export function ProductGridBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const products = parseProducts(c.items);
  const columns = c.columns || "3";

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        {c.badge && <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">{c.badge}</p>}
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
          {c.title || "Our Products"}
        </h2>
        {c.subtitle && (
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{c.subtitle}</p>
        )}
      </div>
      {products.length > 0 ? (
        <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-${columns}`}>
          {products.map((product, i) => (
            <Card key={i} className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
              {product.image && (
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
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
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  asChild={!!product.link}
                >
                  {product.link ? (
                    <a href={product.link}>
                      <ShoppingCart className="size-4" />
                      Add to Cart
                    </a>
                  ) : (
                    <>
                      <ShoppingCart className="size-4" />
                      Add to Cart
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          No products configured. Add items as JSON in the block config.
        </p>
      )}
    </section>
  );
}
