import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPageBySlug,
  getResolvedFeaturedItems,
  getResolvedGallery,
  getResolvedSiteSettings,
  getActiveProducts,
  getActiveServiceCatalog,
} from "@/lib/data";
import { getResolvedSiteId } from "@/lib/site-context";
import { getResolvedSite } from "@/lib/site-context";
import { SectionRenderer } from "@/components/site/sections/section-renderer";
import { getResolvedLocale, getTranslatedPage, getTranslatedPageBlocks } from "@/lib/i18n";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [siteId, locale] = await Promise.all([getResolvedSiteId(), getResolvedLocale()]);
  if (!siteId) return {};
  const [sourcePage, site, settings] = await Promise.all([getPageBySlug(siteId, slug), getResolvedSite(), getResolvedSiteSettings()]);
  if (!sourcePage || !sourcePage.published) return {};
  const page = await getTranslatedPage(sourcePage.id, locale);
  if (!page) return {};
  const title = page.metaTitle || page.title;
  const description = page.metaDescription || page.description || undefined;
  const base = site?.domain ? `https://${site.domain}` : process.env.SITE_URL;
  const canonical = page.canonicalUrl || (base ? `${base}/${page.slug}` : undefined);
  const image = page.ogImage || settings.logo || undefined;
  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    robots: page.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url: canonical,
      images: image ? [{ url: image, alt: title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function CmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [siteId, locale] = await Promise.all([getResolvedSiteId(), getResolvedLocale()]);
  if (!siteId) notFound();

  const sourcePage = await getPageBySlug(siteId, slug);
  if (!sourcePage || !sourcePage.published) notFound();
  const page = await getTranslatedPage(sourcePage.id, locale);
  if (!page) notFound();

  const [blocks, settings, galleryImages, featuredItems, products, serviceCatalog] = await Promise.all([
    getTranslatedPageBlocks(page.id, locale),
    getResolvedSiteSettings(),
    getResolvedGallery(),
    getResolvedFeaturedItems(),
    getActiveProducts(siteId),
    getActiveServiceCatalog(siteId),
  ]);

  return (
    <>
      {blocks.filter((block) => block.visible).map((block) => (
        <SectionRenderer
          key={block.id}
          section={block}
          settings={settings}
          galleryImages={galleryImages}
          featuredItems={featuredItems}
          products={products}
          serviceCategories={serviceCatalog.categories}
          services={serviceCatalog.services}
        />
      ))}
      {blocks.filter((block) => block.visible).length === 0 && (
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h1 className="font-heading text-4xl font-semibold mb-4">{page.title}</h1>
          <p className="text-muted-foreground">This page has no content yet.</p>
        </div>
      )}
    </>
  );
}
