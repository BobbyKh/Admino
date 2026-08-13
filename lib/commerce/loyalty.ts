import { db } from "@/lib/db";
import type { Db } from "@/lib/db";
import { loyaltyLedger } from "@/lib/db/schema";

export function pointsForOrderTotal(total: number) {
  return Math.max(0, Math.floor(total / 100));
}

export async function awardOrderLoyalty(input: {
  siteId: number;
  customerId: number | null;
  orderId: number;
  orderNumber: string;
  total: number;
}, executor: Pick<Db, "insert"> = db) {
  if (!input.customerId) return;
  const points = pointsForOrderTotal(input.total);
  if (points < 1) return;
  await executor.insert(loyaltyLedger).values({
    siteId: input.siteId,
    customerId: input.customerId,
    orderId: input.orderId,
    pointsDelta: points,
    eventType: "order_fulfilled",
    reason: `Points earned from ${input.orderNumber}`,
    idempotencyKey: `order:${input.orderId}:fulfilled`,
  }).onConflictDoNothing({ target: loyaltyLedger.idempotencyKey });
}
