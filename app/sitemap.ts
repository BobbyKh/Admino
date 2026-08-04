import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getResolvedSite } from "@/lib/site-context";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await getResolvedSite();
  const base = site?.domain ? `https://${site.domain}` : process.env.SITE_URL ?? "http://localhost:3000";
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/menu`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/gallery`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/book`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];

  if (!site?.published) return staticPages;

  try {
    const allPages = await db
      .select({
        slug: pages.slug,
        updatedAt: pages.updatedAt,
        siteId: pages.siteId,
      })
      .from(pages)
      .where(and(eq(pages.siteId, site.id), eq(pages.published, true)));

    const cmsPages: MetadataRoute.Sitemap = allPages
      .filter((p) => p.slug && !["menu", "gallery", "book", "contact"].includes(p.slug))
      .map((p) => ({
        url: p.slug === "home" ? base : `${base}/${p.slug}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));

    return [...staticPages, ...cmsPages];
  } catch {
    return staticPages;
  }
}
