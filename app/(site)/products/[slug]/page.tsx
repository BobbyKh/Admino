import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Package, ShieldCheck, Star, Truck } from "lucide-react";
import { ProductPurchaseOptions } from "@/components/site/product-purchase-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getActiveProductBySlug, getActiveProducts, getResolvedSiteSettings } from "@/lib/data";
import { getResolvedSite, getResolvedSiteId } from "@/lib/site-context";
import { parseWholesaleTiers } from "@/lib/commerce/pricing";
import { getProductReviews, getRecentlyViewedProducts } from "@/lib/actions/customers";
import { RecentlyViewedTracker } from "@/components/site/recently-viewed-tracker";

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
    openGraph: { title, description, url: canonical, images: product.image ? [{ url: product.image, alt: product.title }] : undefined, videos: product.video ? [{ url: product.video, type: "video mp4" }] : undefined },
    twitter: { card: product.image ? "summary_large_image" : "summary", title, description, images: product.image ? [product.image] : undefined, videos: product.video ? [product.video] : undefined },
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
  const [reviews, recentlyViewed] = await Promise.all([getProductReviews(product.id), getRecentlyViewedProducts(product.id)]);
  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const previewSlug = site?.domain ? undefined : site?.slug;
  const shopHref = withPreviewSite("/#shop", previewSlug);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? undefined,
    image: product.image ? [product.image] : undefined,
    video: product.video ? [product.video] : undefined,
    brand: settings.siteName ? { "@type": "Brand", name: settings.siteName } : undefined,
    offers: {
      "@type": "Offer",
      price: (product.price / 100).toFixed(2),
      priceCurrency: product.currency.toUpperCase(),
      availability: product.inventoryQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    aggregateRating: reviews.length ? { "@type": "AggregateRating", ratingValue: averageRating.toFixed(1), reviewCount: reviews.length, bestRating: 5, worstRating: 1 } : undefined,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <RecentlyViewedTracker productId={product.id} />
      <Button variant="ghost" size="sm" asChild className="mb-6 gap-2">
        <Link href={shopHref}><ArrowLeft className="size-4" />Back to shop</Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div className="overflow-hidden rounded-2xl border bg-muted/30">
          {product.image ? (
            // Product images may be tenant uploads or external URLs.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.title} className="aspect-square size-full object-cover" />
          ) : product.video && (
            <div className="aspect-square flex items-center justify-center text-muted-foreground">
              <svg
                className="size-6 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <path d="M15 3h6v5h-5v6h2v-6h5l-5 5-5-5z" />
              </svg>
              <span className="ml-2">Video</span>
            </div>
          ) : (
            <div className="flex aspect-square items-center justify-center text-muted-foreground"><Package className="size-16" /></div>
          )}
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-3">
            {product.category && <Badge variant="secondary">{product.category}</Badge>}
            <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">{product.title}</h1>
            {reviews.length > 0 && <a href="#reviews" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Star className="size-4 fill-primary text-primary" />{averageRating.toFixed(1)} from {reviews.length} {reviews.length === 1 ? "review" : "reviews"}</a>}
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

      <section id="reviews" className="mt-16 scroll-mt-24 space-y-6">
        <div><h2 className="font-heading text-2xl font-semibold">Customer reviews</h2><p className="text-sm text-muted-foreground">Feedback from verified, delivered purchases.</p></div>
        {reviews.length === 0 ? <div className="rounded-xl border py-10 text-center text-sm text-muted-foreground">No reviews yet. Customers can review this product after delivery.</div> : (
          <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
            <div className="rounded-xl border p-5"><p className="text-4xl font-bold">{averageRating.toFixed(1)}</p><div className="mt-2 flex gap-1" aria-label={`${averageRating.toFixed(1)} out of 5 stars`}>{[1,2,3,4,5].map((star) => <Star key={star} className={`size-4 ${star <= Math.round(averageRating) ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />)}</div><p className="mt-2 text-sm text-muted-foreground">Based on {reviews.length} verified {reviews.length === 1 ? "purchase" : "purchases"}</p></div>
            <div className="space-y-3">{reviews.map((review) => <article key={review.id} className="rounded-xl border p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex gap-1" aria-label={`${review.rating} out of 5 stars`}>{[1,2,3,4,5].map((star) => <Star key={star} className={`size-4 ${star <= review.rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />)}</div><span className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</span></div>{review.title && <h3 className="mt-3 font-semibold">{review.title}</h3>}<p className="mt-2 text-sm leading-6 text-muted-foreground">{review.body}</p><p className="mt-3 flex items-center gap-1 text-xs font-medium"><CheckCircle2 className="size-3.5 text-primary" />{review.customerName} · Verified purchase</p></article>)}</div>
          </div>
        )}
      </section>

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
      {recentlyViewed.length > 0 && <ProductCards title="Recently viewed" items={recentlyViewed.map((row) => row.product)} previewSlug={previewSlug} />}
    </div>
  );
}

function ProductCards({ title, items, previewSlug }: { title: string; items: Array<{ id: number; title: string; slug: string; image: string | null; price: number; currency: string }>; previewSlug?: string }) {
  return <section className="mt-16 space-y-5"><h2 className="font-heading text-2xl font-semibold">{title}</h2><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.slice(0, 3).map((item) => <Card key={item.id} className="overflow-hidden">{item.image && (
    // Product images may be tenant uploads or external URLs.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.image} alt={item.title} loading="lazy" className="aspect-square w-full object-cover" />
  )}<CardContent className="space-y-3 p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-heading font-semibold">{item.title}</h3><span className="font-semibold text-primary">{formatPrice(item.price, item.currency)}</span></div><Button variant="outline" size="sm" asChild><Link href={withPreviewSite(`/products/${item.slug}`, previewSlug)}>View details</Link></Button></CardContent></Card>)}</div></section>;
}

function TrustCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-xl border p-4"><div className="mb-2 text-primary">{icon}</div><p className="font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{text}</p></div>;
}
