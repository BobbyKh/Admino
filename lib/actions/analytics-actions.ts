"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLogs, orders, pages, products } from "@/lib/db/schema";
import { requireSiteAccess } from "@/lib/tenant-access";

export interface TenantDashboardMetrics {
  siteId: number;
  totalOrders: number;
  totalRevenue: number;
  publishedPagesCount: number;
  activeProductsCount: number;
  recentActivityCount: number;
}

/**
 * Calculates unified analytics and metrics for the tenant admin dashboard.
 */
export async function getTenantAnalyticsDashboard(siteId: number): Promise<TenantDashboardMetrics> {
  await requireSiteAccess(siteId);

  const [orderStats, pageStats, productStats, activityStats] = await Promise.all([
    db
      .select({
        count: sql<number>`count(*)`,
        revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      })
      .from(orders)
      .where(and(eq(orders.siteId, siteId), eq(orders.paymentStatus, "paid"))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(pages)
      .where(and(eq(pages.siteId, siteId), eq(pages.published, true))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(eq(products.siteId, siteId), eq(products.status, "active"))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs)
      .where(eq(activityLogs.siteId, siteId)),
  ]);

  return {
    siteId,
    totalOrders: Number(orderStats[0]?.count ?? 0),
    totalRevenue: Number(orderStats[0]?.revenue ?? 0),
    publishedPagesCount: Number(pageStats[0]?.count ?? 0),
    activeProductsCount: Number(productStats[0]?.count ?? 0),
    recentActivityCount: Number(activityStats[0]?.count ?? 0),
  };
}
