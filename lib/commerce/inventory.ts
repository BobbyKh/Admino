import "server-only";

import { and, eq, lte, sql } from "drizzle-orm";
import { db, type Db } from "@/lib/db";
import { orderItems, orders, products } from "@/lib/db/schema";

type InventoryItem = { productId: number; quantity: number; title: string };
type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

export const ONLINE_RESERVATION_MINUTES = 30;
export const MANUAL_RESERVATION_MINUTES = 24 * 60;

export function inventoryExpiry(minutes: number, now = new Date()) {
  return new Date(now.getTime() + minutes * 60_000).toISOString();
}

export async function reserveInventory(tx: Transaction, siteId: number, items: InventoryItem[]) {
  for (const item of items) {
    const updated = await tx.update(products).set({
      inventoryQuantity: sql`${products.inventoryQuantity} - ${item.quantity}`,
      updatedAt: new Date().toISOString(),
    }).where(and(
      eq(products.id, item.productId),
      eq(products.siteId, siteId),
      eq(products.status, "active"),
      sql`${products.inventoryQuantity} >= ${item.quantity}`
    )).returning({ id: products.id });
    if (updated.length !== 1) throw new Error(`${item.title} is no longer available in that quantity.`);
  }
}

export async function commitInventoryReservation(orderId: number) {
  const now = new Date().toISOString();
  const committed = await db.update(orders).set({
    inventoryStatus: "committed",
    inventoryFinalizedAt: now,
    updatedAt: now,
  }).where(and(eq(orders.id, orderId), eq(orders.inventoryStatus, "reserved"))).returning({ id: orders.id });
  if (committed.length === 1) return true;
  const [order] = await db.select({ inventoryStatus: orders.inventoryStatus }).from(orders).where(eq(orders.id, orderId));
  return order?.inventoryStatus === "committed";
}

export async function releaseInventoryReservation(orderId: number, paymentStatus = "failed") {
  return db.transaction(async (tx) => {
    const now = new Date().toISOString();
    const released = await tx.update(orders).set({
      inventoryStatus: "released",
      inventoryFinalizedAt: now,
      status: "cancelled",
      paymentStatus,
      updatedAt: now,
    }).where(and(eq(orders.id, orderId), eq(orders.inventoryStatus, "reserved"))).returning({ id: orders.id, siteId: orders.siteId });
    if (released.length !== 1) return false;

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const item of items) {
      if (!item.productId) continue;
      await tx.update(products).set({
        inventoryQuantity: sql`${products.inventoryQuantity} + ${item.quantity}`,
        updatedAt: now,
      }).where(and(eq(products.id, item.productId), eq(products.siteId, released[0].siteId)));
    }
    return true;
  });
}

export async function releaseExpiredInventoryReservations(now = new Date()) {
  const expired = await db.select({ id: orders.id }).from(orders).where(and(
    eq(orders.inventoryStatus, "reserved"),
    lte(orders.inventoryExpiresAt, now.toISOString())
  ));
  let released = 0;
  for (const order of expired) {
    if (await releaseInventoryReservation(order.id, "expired")) released += 1;
  }
  return released;
}
