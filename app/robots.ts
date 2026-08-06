import type { MetadataRoute } from "next";
import { getResolvedSite } from "@/lib/site-context";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getResolvedSite();
  const base = site?.domain ? `https://${site.domain}` : process.env.SITE_URL ?? "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
