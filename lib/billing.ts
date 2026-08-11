import "server-only";

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, subscriptions, pages, products } from "@/lib/db/schema";

export async function getActivePlans() {
  return db
    .select()
    .from(plans)
    .where(eq(plans.active, true))
    .orderBy(plans.sortOrder);
}

export async function getPlanBySlug(slug: string) {
  const [plan] = await db.select().from(plans).where(eq(plans.slug, slug));
  return plan ?? null;
}

export async function getSiteSubscription(siteId: number) {
  const [sub] = await db
    .select({
      id: subscriptions.id,
      status: subscriptions.status,
      planId: subscriptions.planId,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAt: subscriptions.cancelAt,
      plan: {
        id: plans.id,
        name: plans.name,
        slug: plans.slug,
        price: plans.price,
        currency: plans.currency,
        interval: plans.interval,
        features: plans.features,
        maxPages: plans.maxPages,
        maxProducts: plans.maxProducts,
        maxStorage: plans.maxStorage,
        maxBandwidth: plans.maxBandwidth,
      },
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.siteId, siteId))
    .limit(1);

  return sub ?? null;
}

export async function createOrReactivateSubscription(siteId: number, planId: number) {
  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.siteId, siteId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(subscriptions)
      .set({
        planId,
        status: "active",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(subscriptions.id, existing[0].id));
    return existing[0].id;
  }

  const [sub] = await db
    .insert(subscriptions)
    .values({ siteId, planId, status: "active" })
    .returning({ id: subscriptions.id });

  return sub.id;
}

export async function cancelSiteSubscription(siteId: number) {
  await db
    .update(subscriptions)
    .set({
      status: "cancelled",
      cancelAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(subscriptions.siteId, siteId));
}

export async function checkSiteQuota(
  siteId: number,
  resource: "pages" | "products"
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const sub = await getSiteSubscription(siteId);

  if (!sub) {
    return { allowed: true, current: 0, limit: Infinity };
  }

  const limit =
    resource === "pages" ? sub.plan.maxPages : sub.plan.maxProducts;

  const table = resource === "pages" ? pages : products;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(table)
    .where(eq(table.siteId, siteId));

  const current = row?.count ?? 0;
  return { allowed: current < limit, current, limit };
}
