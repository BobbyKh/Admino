"use server";

import { and, eq, desc, sql, like, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  customers,
  customerAddresses,
  orders,
  wishlists,
  products,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";

// ─── Admin Customer Actions ──────────────────────────────────────────────────

export async function getAdminCustomers(query?: string) {
  const user = await requireAdmin();
  if (!user.siteId) return [];

  if (query) {
    const pattern = `%${query}%`;
    return db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.siteId, user.siteId),
          or(
            like(customers.name, pattern),
            like(customers.email, pattern),
            like(customers.phone, pattern)
          )
        )
      )
      .orderBy(desc(customers.createdAt));
  }

  return db
    .select()
    .from(customers)
    .where(eq(customers.siteId, user.siteId))
    .orderBy(desc(customers.createdAt));
}

export async function getAdminCustomer(customerId: number) {
  const user = await requireAdmin();
  if (!user.siteId) return null;

  const [customer] = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.siteId, user.siteId)
      )
    )
    .limit(1);

  if (!customer) return null;

  const [addresses, customerOrders, wishlistItems] = await Promise.all([
    db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, customerId))
      .orderBy(desc(customerAddresses.isDefault)),
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        total: orders.total,
        currency: orders.currency,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt)),
    db
      .select({
        id: wishlists.id,
        product: {
          id: products.id,
          title: products.title,
          slug: products.slug,
          image: products.image,
          price: products.price,
        },
      })
      .from(wishlists)
      .innerJoin(products, eq(wishlists.productId, products.id))
      .where(eq(wishlists.customerId, customerId))
      .orderBy(desc(wishlists.createdAt)),
  ]);

  return { customer, addresses, orders: customerOrders, wishlist: wishlistItems };
}

export async function getAdminCustomerStats() {
  const user = await requireAdmin();
  if (!user.siteId) return { total: 0, thisMonth: 0, totalOrders: 0, totalRevenue: 0 };

  const [total] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customers)
    .where(eq(customers.siteId, user.siteId));

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [thisMonth] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customers)
    .where(
      and(
        eq(customers.siteId, user.siteId),
        sql`${customers.createdAt} >= ${monthStart.toISOString()}`
      )
    );

  const [orderStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
    })
    .from(orders)
    .where(eq(orders.siteId, user.siteId));

  return {
    total: total?.count ?? 0,
    thisMonth: thisMonth?.count ?? 0,
    totalOrders: orderStats?.count ?? 0,
    totalRevenue: orderStats?.revenue ?? 0,
  };
}

const updateCustomerSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional(),
});

export async function updateAdminCustomer(
  customerId: number,
  _prev: unknown,
  formData: FormData
) {
  const user = await requireAdmin();
  if (!user.siteId) return { success: false, message: "No site assigned." };

  const parsed = updateCustomerSchema.safeParse({
    name: formData.get("name") || undefined,
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  await db
    .update(customers)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(
      and(eq(customers.id, customerId), eq(customers.siteId, user.siteId))
    );

  revalidatePath("/admin/customers");
  return { success: true, message: "Customer updated." };
}

export async function deleteAdminCustomer(customerId: number) {
  const user = await requireAdmin();
  if (!user.siteId) return { success: false, message: "No site assigned." };

  // Check for orders — don't delete customers with order history
  const [orderCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.customerId, customerId));

  if (orderCount && orderCount.count > 0) {
    return {
      success: false,
      message: "Cannot delete a customer with order history.",
    };
  }

  await db
    .delete(customers)
    .where(
      and(eq(customers.id, customerId), eq(customers.siteId, user.siteId))
    );

  revalidatePath("/admin/customers");
  return { success: true, message: "Customer deleted." };
}
