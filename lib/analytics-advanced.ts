"use server";

import { and, eq, sql, desc, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { pageViews, clickEvents, pages } from "@/lib/db/schema";

/**
 * Track a page view.
 */
export async function trackPageView(data: {
  siteId: number;
  path: string;
  visitorId: string;
  referrer?: string;
  userAgent?: string;
  ip?: string;
  country?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}): Promise<void> {
  const device = parseDevice(data.userAgent);
  const browser = parseBrowser(data.userAgent);
  const os = parseOs(data.userAgent);
  const ipHash = data.ip ? await hashIp(data.ip) : null;

  // Try to match path to a page
  let pageId: number | null = null;
  const slug = data.path.split("/").filter(Boolean).pop() ?? "home";
  const [matchedPage] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.siteId, data.siteId), eq(pages.slug, slug)))
    .limit(1);
  if (matchedPage) pageId = matchedPage.id;

  await db.insert(pageViews).values({
    siteId: data.siteId,
    pageId,
    path: data.path,
    visitorId: data.visitorId,
    referrer: data.referrer,
    userAgent: data.userAgent?.slice(0, 500),
    ipHash,
    country: data.country,
    device,
    browser,
    os,
    utmSource: data.utmSource,
    utmMedium: data.utmMedium,
    utmCampaign: data.utmCampaign,
  });
}

/**
 * Track a click event for heatmap data.
 */
export async function trackClickEvent(data: {
  siteId: number;
  visitorId: string;
  path: string;
  selector?: string;
  x: number;
  y: number;
  label?: string;
}): Promise<void> {
  await db.insert(clickEvents).values({
    siteId: data.siteId,
    visitorId: data.visitorId,
    path: data.path,
    selector: data.selector?.slice(0, 200),
    x: Math.round(data.x),
    y: Math.round(data.y),
    label: data.label?.slice(0, 200),
  });
}

/**
 * Update page view duration.
 */
export async function updatePageViewDuration(
  visitorId: string,
  path: string,
  duration: number
): Promise<void> {
  const [latest] = await db
    .select({ id: pageViews.id })
    .from(pageViews)
    .where(and(eq(pageViews.visitorId, visitorId), eq(pageViews.path, path)))
    .orderBy(desc(pageViews.createdAt))
    .limit(1);

  if (latest) {
    await db
      .update(pageViews)
      .set({ duration })
      .where(eq(pageViews.id, latest.id));
  }
}

// ─── Analytics Queries ───────────────────────────────────────────────────────

export async function getSiteAnalytics(
  siteId: number,
  days: number = 30
) {
  const startDate = new Date(Date.now() - days * 86400000).toISOString();

  const [totalViews] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pageViews)
    .where(and(eq(pageViews.siteId, siteId), gte(pageViews.createdAt, startDate)));

  const [uniqueVisitors] = await db
    .select({ count: sql<number>`count(distinct ${pageViews.visitorId})::int` })
    .from(pageViews)
    .where(and(eq(pageViews.siteId, siteId), gte(pageViews.createdAt, startDate)));

  const topPages = await db
    .select({
      path: pageViews.path,
      count: sql<number>`count(*)::int`,
    })
    .from(pageViews)
    .where(and(eq(pageViews.siteId, siteId), gte(pageViews.createdAt, startDate)))
    .groupBy(pageViews.path)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const dailyViews = await db
    .select({
      date: sql<string>`date(${pageViews.createdAt})`,
      views: sql<number>`count(*)::int`,
      visitors: sql<number>`count(distinct ${pageViews.visitorId})::int`,
    })
    .from(pageViews)
    .where(and(eq(pageViews.siteId, siteId), gte(pageViews.createdAt, startDate)))
    .groupBy(sql`date(${pageViews.createdAt})`)
    .orderBy(sql`date(${pageViews.createdAt})`);

  const deviceBreakdown = await db
    .select({
      device: pageViews.device,
      count: sql<number>`count(*)::int`,
    })
    .from(pageViews)
    .where(and(eq(pageViews.siteId, siteId), gte(pageViews.createdAt, startDate)))
    .groupBy(pageViews.device)
    .orderBy(desc(sql`count(*)`));

  const countryBreakdown = await db
    .select({
      country: pageViews.country,
      count: sql<number>`count(*)::int`,
    })
    .from(pageViews)
    .where(and(eq(pageViews.siteId, siteId), gte(pageViews.createdAt, startDate)))
    .groupBy(pageViews.country)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const referrerBreakdown = await db
    .select({
      referrer: pageViews.referrer,
      count: sql<number>`count(*)::int`,
    })
    .from(pageViews)
    .where(
      and(
        eq(pageViews.siteId, siteId),
        gte(pageViews.createdAt, startDate),
        sql`${pageViews.referrer} IS NOT NULL AND ${pageViews.referrer} != ''`
      )
    )
    .groupBy(pageViews.referrer)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const utmBreakdown = await db
    .select({
      source: pageViews.utmSource,
      medium: pageViews.utmMedium,
      campaign: pageViews.utmCampaign,
      count: sql<number>`count(*)::int`,
    })
    .from(pageViews)
    .where(
      and(
        eq(pageViews.siteId, siteId),
        gte(pageViews.createdAt, startDate),
        sql`${pageViews.utmSource} IS NOT NULL`
      )
    )
    .groupBy(pageViews.utmSource, pageViews.utmMedium, pageViews.utmCampaign)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const avgDuration = await db
    .select({
      avg: sql<number>`coalesce(avg(${pageViews.duration}), 0)::int`,
    })
    .from(pageViews)
    .where(
      and(
        eq(pageViews.siteId, siteId),
        gte(pageViews.createdAt, startDate),
        sql`${pageViews.duration} IS NOT NULL`
      )
    );

  return {
    totalViews: totalViews?.count ?? 0,
    uniqueVisitors: uniqueVisitors?.count ?? 0,
    topPages,
    dailyViews,
    deviceBreakdown,
    countryBreakdown,
    referrerBreakdown,
    utmBreakdown,
    avgDuration: avgDuration?.avg ?? 0,
  };
}

export async function getHeatmapData(siteId: number, path: string) {
  const startDate = new Date(Date.now() - 30 * 86400000).toISOString();

  const clicks = await db
    .select({
      x: clickEvents.x,
      y: clickEvents.y,
      count: sql<number>`count(*)::int`,
    })
    .from(clickEvents)
    .where(
      and(
        eq(clickEvents.siteId, siteId),
        eq(clickEvents.path, path),
        gte(clickEvents.createdAt, startDate)
      )
    )
    .groupBy(clickEvents.x, clickEvents.y)
    .orderBy(desc(sql`count(*)`));

  return clicks;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDevice(ua?: string): string {
  if (!ua) return "unknown";
  if (/mobile|android|iphone/i.test(ua)) return "mobile";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  return "desktop";
}

function parseBrowser(ua?: string): string {
  if (!ua) return "unknown";
  if (/chrome/i.test(ua)) return "chrome";
  if (/firefox/i.test(ua)) return "firefox";
  if (/safari/i.test(ua)) return "safari";
  if (/edge/i.test(ua)) return "edge";
  if (/opera|opr/i.test(ua)) return "opera";
  return "other";
}

function parseOs(ua?: string): string {
  if (!ua) return "unknown";
  if (/windows/i.test(ua)) return "windows";
  if (/macintosh|mac os/i.test(ua)) return "macos";
  if (/linux/i.test(ua)) return "linux";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "other";
}

async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + (process.env.AUTH_SECRET ?? "salt"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
