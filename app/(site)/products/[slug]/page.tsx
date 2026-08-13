import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, ShieldCheck, Truck } from "lucide-react";
import { ProductPurchaseOptions } from "@/components/site/product-purchase-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getActiveProductBySlug, getActiveProducts, getResolvedSiteSettings } from "@/lib/data";
import { getResolvedSite, getResolvedSiteId } from "@/lib/site-context";
import { parseWholesaleTiers } from "@/lib/commerce/pricing";

export const revalidate = 300;

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(price / 100);
}

function parseOptions(raw: string | null) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0) : [];
  } catch {
    return raw.split(",").map((value) => value.trim()).filter(Boolean);
  }
}

function withPreviewSite(path: string, siteSlug?: string) {
  return siteSlug ? `${path}${path.includes("?") ? "&" : "?"}site=${encodeURIComponent(siteSlug)}` : path;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const siteId = await getResolvedSiteId();
  if (!siteId) return {};
  const [product, site, settings] = await Promise.all([getActiveProductBySlug(siteId, slug), getResolvedSite(), getResolvedSiteSettings()]);
  if (!product) return {};
  const title = `${product.title}${settings.siteName ? ` | ${settings.siteName}` : ""}`;
  const description = product.description?.slice(0, 160) || undefined;
  const base = site?.domain ? `https://${site.domain}` : process.env.SITE_URL;
  const canonical = base ? `${base}/products/${product.slug}` : undefined;
  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: { title, description, url: canonical, images: product.image ? [{ url: product.image, alt: product.title }] : undefined },
    twitter: { card: product.image ? "summary_large_image" : "summary", title, description, images: product.image ? [product.image] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const siteId = await getResolvedSiteId();
  if (!siteId) notFound();
  const [product, site, settings, allProducts] = await Promise.all([
    getActiveProductBySlug(siteId, slug),
    getResolvedSite(),
    getResolvedSiteSettings(),
    getActiveProducts(siteId),
  ]);
  if (!product) notFound();

  const sizes = parseOptions(product.sizes);
  const colors = parseOptions(product.colors);
  const wholesaleTiers = parseWholesaleTiers(product.wholesaleTiers);
  const related = allProducts.filter((item) => item.id !== product.id && item.category && item.category === product.category).slice(0, 3);
  const previewSlug = site?.domain ? undefined : site?.slug;
  const shopHref = withPreviewSite("/#shop", previewSlug);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? undefined,
    image: product.image ? [product.image] : undefined,
    brand: settings.siteName ? { "@type": "Brand", name: settings.siteName } : undefined,
    offers: {
      "@type": "Offer",
      price: (product.price / 100).toFixed(2),
      priceCurrency: product.currency.toUpperCase(),
      availability: product.inventoryQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Button variant="ghost" size="sm" asChild className="mb-6 gap-2">
        <Link href={shopHref}><ArrowLeft className="size-4" />Back to shop</Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div className="overflow-hidden rounded-2xl border bg-muted/30">
          {product.image ? (
            // Product images may be tenant uploads or external URLs.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.title} className="aspect-square size-full object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center text-muted-foreground"><Package className="size-16" /></div>
          )}
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-3">
            {product.category && <Badge variant="secondary">{product.category}</Badge>}
            <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">{product.title}</h1>
            <p className="text-3xl font-semibold text-primary">{formatPrice(product.price, product.currency)}</p>
            <p className="text-sm font-medium text-muted-foreground">{product.inventoryQuantity > 0 ? `${product.inventoryQuantity} available` : "Out of stock"}</p>
          </div>

          {product.description && <p className="text-base leading-7 text-muted-foreground">{product.description}</p>}

          <ProductPurchaseOptions productId={product.id} available={product.inventoryQuantity > 0} inventoryQuantity={product.inventoryQuantity} sizes={sizes} colors={colors} wholesaleTiers={wholesaleTiers} currency={product.currency} />

          <div className="grid gap-3 sm:grid-cols-2">
            <TrustCard icon={<Truck className="size-5" />} title="Order support" text="The store will confirm availability and fulfillment details." />
            <TrustCard icon={<ShieldCheck className="size-5" />} title="Secure checkout" text="Payment and order details stay scoped to this store." />
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16 space-y-5">
          <h2 className="font-heading text-2xl font-semibold">Related products</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                {item.image && (
                  // Product images may be tenant uploads or external URLs.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.title} loading="lazy" className="aspect-square w-full object-cover" />
                )}
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-heading font-semibold">{item.title}</h3>
                    <span className="font-semibold text-primary">{formatPrice(item.price, item.currency)}</span>
                  </div>
                  <Button variant="outline" size="sm" asChild><Link href={withPreviewSite(`/products/${item.slug}`, previewSlug)}>View details</Link></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TrustCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-xl border p-4"><div className="mb-2 text-primary">{icon}</div><p className="font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{text}</p></div>;
}
