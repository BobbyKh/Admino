import "server-only";

import { and, count, eq, ne, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { orders, promotionRedemptions, promotions } from "@/lib/db/schema";

type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

export async function recordPromotionRedemption(tx: Transaction, input: { siteId: number; promotionId: number; orderId: number; email: string; amount: number }) {
  await tx.execute(sql`select id from ${promotions} where ${promotions.id} = ${input.promotionId} and ${promotions.siteId} = ${input.siteId} for update`);
  const [promotion] = await tx.select().from(promotions).where(and(eq(promotions.id, input.promotionId), eq(promotions.siteId, input.siteId)));
  if (!promotion) throw new Error("Discount code is no longer available.");

  if (promotion.usageLimit) {
    const [{ value }] = await tx.select({ value: count() }).from(promotionRedemptions).innerJoin(orders, eq(promotionRedemptions.orderId, orders.id)).where(and(eq(promotionRedemptions.promotionId, promotion.id), ne(orders.status, "cancelled")));
    if (value >= promotion.usageLimit) throw new Error("This discount code has reached its usage limit.");
  }
  if (promotion.perCustomerLimit) {
    const [{ value }] = await tx.select({ value: count() }).from(promotionRedemptions).innerJoin(orders, eq(promotionRedemptions.orderId, orders.id)).where(and(eq(promotionRedemptions.siteId, input.siteId), eq(promotionRedemptions.promotionId, promotion.id), eq(promotionRedemptions.email, input.email), ne(orders.status, "cancelled")));
    if (value >= promotion.perCustomerLimit) throw new Error("You have already used this discount code.");
  }
  if (promotion.firstOrderOnly) {
    const [{ value }] = await tx.select({ value: count() }).from(orders).where(and(eq(orders.siteId, input.siteId), eq(orders.email, input.email), ne(orders.status, "cancelled")));
    if (value > 1) throw new Error("This discount is only available on a first order.");
  }
  await tx.insert(promotionRedemptions).values(input);
}
