import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPageBySlug,
  getPageBlocks,
  getResolvedFeaturedItems,
  getResolvedGallery,
  getResolvedSiteSettings,
  getActiveProducts,
  getActiveServiceCatalog,
} from "@/lib/data";
import { getResolvedSiteId } from "@/lib/site-context";
import { getResolvedSite } from "@/lib/site-context";
import { SectionRenderer } from "@/components/site/sections/section-renderer";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const siteId = await getResolvedSiteId();
  if (!siteId) return {};
  const [page, site, settings] = await Promise.all([getPageBySlug(siteId, slug), getResolvedSite(), getResolvedSiteSettings()]);
  if (!page || !page.published) return {};
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
  const siteId = await getResolvedSiteId();
  if (!siteId) notFound();

  const page = await getPageBySlug(siteId, slug);
  if (!page || !page.published) notFound();

  const [blocks, settings, galleryImages, featuredItems, products, serviceCatalog] = await Promise.all([
    getPageBlocks(page.id),
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
