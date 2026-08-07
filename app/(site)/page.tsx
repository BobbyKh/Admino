import type { Metadata } from "next";
import {
  getResolvedFeaturedItems,
  getResolvedGallery,
  getResolvedHomeSections,
  getResolvedSiteSettings,
  getPageBlocks,
  getPageBySlug,
  getActiveProducts,
  getActiveServiceCatalog,
} from "@/lib/data";
import { getResolvedSiteId } from "@/lib/site-context";
import { getResolvedSite } from "@/lib/site-context";
import { SectionRenderer } from "@/components/site/sections/section-renderer";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [settings, site, siteId] = await Promise.all([getResolvedSiteSettings(), getResolvedSite(), getResolvedSiteId()]);
  const homepage = siteId ? await getPageBySlug(siteId, "home") : null;
  const title = homepage?.metaTitle || (settings.siteName ? `${settings.siteName} — ${settings.tagline || "Welcome"}` : undefined);
  const description = homepage?.metaDescription || settings.description?.slice(0, 160) || undefined;
  const base = site?.domain ? `https://${site.domain}` : process.env.SITE_URL;
  const canonical = homepage?.canonicalUrl || base;
  const image = homepage?.ogImage || settings.logo || undefined;
  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    robots: homepage?.noindex ? { index: false, follow: false } : undefined,
    openGraph: { title, description, url: canonical, images: image ? [{ url: image, alt: title || settings.siteName }] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
  };
}

export default async function HomePage() {
  const siteId = await getResolvedSiteId();
  const [settings, gallery, featured, sections, products, serviceCatalog] = await Promise.all([
    getResolvedSiteSettings(),
    getResolvedGallery(),
    getResolvedFeaturedItems(),
    getResolvedHomeSections(),
    getActiveProducts(siteId),
    getActiveServiceCatalog(siteId),
  ]);
  const homepage = siteId ? await getPageBySlug(siteId, "home") : null;
  const homepageBlocks = homepage?.published ? await getPageBlocks(homepage.id) : [];

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.siteName,
    url: process.env.SITE_URL ?? "http://localhost:3000",
  };

  if (settings.heroImage) Object.assign(jsonLd, { logo: settings.heroImage });
  if (settings.description) Object.assign(jsonLd, { description: settings.description.slice(0, 300) });
  if (settings.phone) Object.assign(jsonLd, { telephone: settings.phone });
  if (settings.address) Object.assign(jsonLd, { address: settings.address });
  if (settings.rating) {
    Object.assign(jsonLd, {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: settings.rating,
        reviewCount: settings.reviewCount || "0",
      },
    });
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {homepage?.published && homepageBlocks
        .filter((block) => block.visible)
        .map((block) => (
        <SectionRenderer
          key={block.id}
          section={block}
          settings={settings}
          galleryImages={gallery}
          featuredItems={featured}
          products={products}
          serviceCategories={serviceCatalog.categories}
          services={serviceCatalog.services}
        />
      ))}

      {/* Legacy sites continue using their existing homepage sections until provisioned. */}
      {!homepage?.published && sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          settings={settings}
          galleryImages={gallery}
          featuredItems={featured}
          products={products}
          serviceCategories={serviceCatalog.categories}
          services={serviceCatalog.services}
        />
      ))}

      {/* Fallback: if no sections configured, show default layout */}
      {!homepage?.published && sections.length === 0 && (
        <>
          <SectionRenderer
            section={{ id: 0, type: "hero", title: null, sortOrder: 0, visible: true, config: null, createdAt: "", siteId: null }}
            settings={settings}
            galleryImages={gallery}
            featuredItems={featured}
            products={products}
          />
          <SectionRenderer
            section={{ id: 0, type: "features", title: null, sortOrder: 1, visible: true, config: null, createdAt: "", siteId: null }}
            settings={settings}
            galleryImages={gallery}
            featuredItems={featured}
            products={products}
          />
          <SectionRenderer
            section={{ id: 0, type: "about", title: null, sortOrder: 2, visible: true, config: null, createdAt: "", siteId: null }}
            settings={settings}
            galleryImages={gallery}
            featuredItems={featured}
            products={products}
          />
          <SectionRenderer
            section={{ id: 0, type: "video", title: null, sortOrder: 3, visible: true, config: null, createdAt: "", siteId: null }}
            settings={settings}
            galleryImages={gallery}
            featuredItems={featured}
            products={products}
          />
          <SectionRenderer
            section={{ id: 0, type: "menuPreview", title: null, sortOrder: 4, visible: true, config: null, createdAt: "", siteId: null }}
            settings={settings}
            galleryImages={gallery}
            featuredItems={featured}
            products={products}
          />
          <SectionRenderer
            section={{ id: 0, type: "gallery", title: null, sortOrder: 5, visible: true, config: null, createdAt: "", siteId: null }}
            settings={settings}
            galleryImages={gallery}
            featuredItems={featured}
            products={products}
          />
          <SectionRenderer
            section={{ id: 0, type: "cta", title: null, sortOrder: 6, visible: true, config: null, createdAt: "", siteId: null }}
            settings={settings}
            galleryImages={gallery}
            featuredItems={featured}
            products={products}
          />
        </>
      )}
    </>
  );
}
