import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug, getPageBlocks, getResolvedSiteSettings } from "@/lib/data";
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
  if (!page) return {};
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
  if (!page) notFound();

  const [blocks, settings] = await Promise.all([
    getPageBlocks(page.id),
    getResolvedSiteSettings(),
  ]);

  return (
    <>
      {blocks.map((block) => (
        <SectionRenderer
          key={block.id}
          section={block}
          settings={settings}
          galleryImages={[]}
          featuredItems={[]}
        />
      ))}
      {blocks.length === 0 && (
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h1 className="font-heading text-4xl font-semibold mb-4">{page.title}</h1>
          <p className="text-muted-foreground">This page has no content yet.</p>
        </div>
      )}
    </>
  );
}
