import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { blogPosts, pages } from "@/lib/db/schema";
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
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  ];

  if (!site?.published) return staticPages;

  try {
    const [allPages, publishedPosts] = await Promise.all([db
      .select({
        slug: pages.slug,
        updatedAt: pages.updatedAt,
        siteId: pages.siteId,
      })
      .from(pages)
      .where(and(eq(pages.siteId, site.id), eq(pages.published, true))),
    db.select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt }).from(blogPosts)
      .where(and(eq(blogPosts.siteId, site.id), eq(blogPosts.published, true))),
    ]);

    const cmsPages: MetadataRoute.Sitemap = allPages
      .filter((p) => p.slug && !["menu", "gallery", "book", "contact"].includes(p.slug))
      .map((p) => ({
        url: p.slug === "home" ? base : `${base}/${p.slug}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));

    const blogRoutes: MetadataRoute.Sitemap = publishedPosts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
    return [...staticPages, ...cmsPages, ...blogRoutes];
  } catch {
    return staticPages;
  }
}
