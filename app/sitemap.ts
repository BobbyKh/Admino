import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { pages, sites } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const BASE = process.env.SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/menu`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/gallery`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/book`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];

  try {
    const allPages = await db
      .select({
        slug: pages.slug,
        updatedAt: pages.updatedAt,
        siteId: pages.siteId,
      })
      .from(pages)
      .where(eq(pages.published, true));

    const cmsPages: MetadataRoute.Sitemap = allPages
      .filter((p) => p.slug && !["menu", "gallery", "book", "contact"].includes(p.slug))
      .map((p) => ({
        url: p.slug === "home" ? BASE : `${BASE}/${p.slug}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));

    return [...staticPages, ...cmsPages];
  } catch {
    return staticPages;
  }
}
