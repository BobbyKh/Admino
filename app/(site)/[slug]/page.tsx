import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPageBySlug,
  getPageBlocks,
  getResolvedFeaturedItems,
  getResolvedGallery,
  getResolvedSiteSettings,
  getActiveProducts,
} from "@/lib/data";
import { getResolvedSiteId } from "@/lib/site-context";
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
  const page = await getPageBySlug(siteId, slug);
  if (!page || !page.published) return {};
  return {
    title: page.title,
    description: page.description || undefined,
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

  const [blocks, settings, galleryImages, featuredItems, products] = await Promise.all([
    getPageBlocks(page.id),
    getResolvedSiteSettings(),
    getResolvedGallery(),
    getResolvedFeaturedItems(),
    getActiveProducts(siteId),
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
