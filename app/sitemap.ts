import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sites, pages, blogPosts, products } from "@/lib/db/schema";

export const revalidate = 3600; // 1 hour revalidation

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.SITE_URL || "https://example.com";

  try {
    const [publishedSites, publishedPages, posts, activeProducts] = await Promise.all([
      db.select({ slug: sites.slug, updatedAt: sites.updatedAt }).from(sites).where(eq(sites.published, true)),
      db.select({ siteId: pages.siteId, slug: pages.slug, updatedAt: pages.updatedAt }).from(pages).where(and(eq(pages.published, true), eq(pages.noindex, false))),
      db.select({ siteId: blogPosts.siteId, slug: blogPosts.slug, publishedAt: blogPosts.publishedAt }).from(blogPosts).where(eq(blogPosts.status, "published")),
      db.select({ siteId: products.siteId, slug: products.slug, updatedAt: products.updatedAt }).from(products).where(eq(products.status, "active")),
    ]);

    const siteMapBySiteId = new Map<number, string>();
    const siteEntries: MetadataRoute.Sitemap = publishedSites.map((site) => {
      const siteUrl = `${baseUrl}?site=${encodeURIComponent(site.slug)}`;
      return {
        url: siteUrl,
        lastModified: site.updatedAt ? new Date(site.updatedAt) : new Date(),
        changeFrequency: "daily",
        priority: 1.0,
      };
    });

    const pageEntries: MetadataRoute.Sitemap = publishedPages.map((page) => ({
      url: `${baseUrl}/${page.slug}`,
      lastModified: page.updatedAt ? new Date(page.updatedAt) : new Date(),
      changeFrequency: "weekly",
      priority: page.slug === "home" ? 0.9 : 0.7,
    }));

    const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    const productEntries: MetadataRoute.Sitemap = activeProducts.map((product) => ({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...siteEntries, ...pageEntries, ...blogEntries, ...productEntries];
  } catch (error) {
    console.error("Failed to generate sitemap:", error);
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1.0,
      },
    ];
  }
}
