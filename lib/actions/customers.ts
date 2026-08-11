"use server";

import { and, eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  customers,
  customerAddresses,
  wishlists,
  orders,
  orderItems,
  products,
} from "@/lib/db/schema";
import { hashPassword } from "@/lib/password";
import { getResolvedSiteId } from "@/lib/site-context";
import {
  createCustomerSession,
  destroyCustomerSession,
  getSessionCustomer,
  verifyCustomerCredentials,
} from "@/lib/customer-auth";
import { dispatchWebhook } from "@/lib/webhooks";

// ─── Auth Actions ────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  phone: z.string().max(20).optional(),
});

export async function registerCustomer(_prev: unknown, formData: FormData) {
  const siteId = await getResolvedSiteId();
  if (!siteId) return { success: false, message: "Site not found." };

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.siteId, siteId), eq(customers.email, parsed.data.email.toLowerCase())))
    .limit(1);

  if (existing.length > 0) {
    return { success: false, message: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const [customer] = await db
    .insert(customers)
    .values({
      siteId,
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      phone: parsed.data.phone,
    })
    .returning({ id: customers.id });

  await createCustomerSession(customer.id);
  revalidatePath("/");

  // Dispatch webhook
  void dispatchWebhook(siteId, "customer.registered", {
    customer: {
      id: customer.id,
      name: parsed.data.name,
      email: parsed.data.email,
    },
  }).catch(() => {});

  return { success: true, message: "Account created." };
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginCustomer(_prev: unknown, formData: FormData) {
  const siteId = await getResolvedSiteId();
  if (!siteId) return { success: false, message: "Site not found." };

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { success: false, message: "Please enter a valid email and password." };
  }

  const customer = await verifyCustomerCredentials(
    siteId,
    parsed.data.email,
    parsed.data.password
  );
  if (!customer) {
    return { success: false, message: "Invalid email or password." };
  }

  await createCustomerSession(customer.id);
  revalidatePath("/");
  return { success: true, message: "Logged in." };
}

export async function logoutCustomer() {
  await destroyCustomerSession();
  revalidatePath("/");
  return { success: true, message: "Logged out." };
}

// ─── Profile Actions ─────────────────────────────────────────────────────────

export async function getCustomerProfile() {
  const customer = await getSessionCustomer();
  if (!customer) return null;
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    createdAt: customer.createdAt,
  };
}

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional(),
});

export async function updateCustomerProfile(_prev: unknown, formData: FormData) {
  const customer = await getSessionCustomer();
  if (!customer) return { success: false, message: "Not authenticated." };

  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name") || undefined,
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db
    .update(customers)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(customers.id, customer.id));

  revalidatePath("/account");
  return { success: true, message: "Profile updated." };
}

// ─── Order Actions ───────────────────────────────────────────────────────────

export async function getCustomerOrders() {
  const customer = await getSessionCustomer();
  if (!customer) return [];

  const customerOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, customer.id))
    .orderBy(desc(orders.createdAt));

  return customerOrders;
}

export async function getCustomerOrder(orderNumber: string) {
  const customer = await getSessionCustomer();
  if (!customer) return null;

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.customerId, customer.id), eq(orders.orderNumber, orderNumber)));

  if (!order) return null;

  const items = await db
    .select({
      id: orderItems.id,
      title: orderItems.title,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      selectedOptions: orderItems.selectedOptions,
      productImage: products.image,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, order.id));

  return { ...order, items };
}

// ─── Address Actions ─────────────────────────────────────────────────────────

export async function getCustomerAddresses() {
  const customer = await getSessionCustomer();
  if (!customer) return [];

  return db
    .select()
    .from(customerAddresses)
    .where(eq(customerAddresses.customerId, customer.id))
    .orderBy(desc(customerAddresses.isDefault));
}

const addressSchema = z.object({
  label: z.string().max(50).default("Home"),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).default("US"),
  isDefault: z.boolean().default(false),
});

export async function addCustomerAddress(_prev: unknown, formData: FormData) {
  const customer = await getSessionCustomer();
  if (!customer) return { success: false, message: "Not authenticated." };

  const parsed = addressSchema.safeParse({
    label: formData.get("label") || undefined,
    line1: formData.get("line1"),
    line2: formData.get("line2") || undefined,
    city: formData.get("city"),
    state: formData.get("state") || undefined,
    postalCode: formData.get("postalCode") || undefined,
    country: formData.get("country") || undefined,
    isDefault: formData.get("isDefault") === "on",
  });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (parsed.data.isDefault) {
    await db
      .update(customerAddresses)
      .set({ isDefault: false })
      .where(eq(customerAddresses.customerId, customer.id));
  }

  await db.insert(customerAddresses).values({
    customerId: customer.id,
    ...parsed.data,
  });

  revalidatePath("/account/addresses");
  return { success: true, message: "Address added." };
}

export async function deleteCustomerAddress(addressId: number) {
  const customer = await getSessionCustomer();
  if (!customer) return { success: false, message: "Not authenticated." };

  await db
    .delete(customerAddresses)
    .where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.customerId, customer.id)));

  revalidatePath("/account/addresses");
  return { success: true, message: "Address deleted." };
}

export async function setDefaultAddress(addressId: number) {
  const customer = await getSessionCustomer();
  if (!customer) return { success: false, message: "Not authenticated." };

  await db
    .update(customerAddresses)
    .set({ isDefault: false })
    .where(eq(customerAddresses.customerId, customer.id));

  await db
    .update(customerAddresses)
    .set({ isDefault: true })
    .where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.customerId, customer.id)));

  revalidatePath("/account/addresses");
  return { success: true, message: "Default address updated." };
}

// ─── Wishlist Actions ────────────────────────────────────────────────────────

export async function getCustomerWishlist() {
  const customer = await getSessionCustomer();
  if (!customer) return [];

  return db
    .select({
      id: wishlists.id,
      createdAt: wishlists.createdAt,
      product: {
        id: products.id,
        title: products.title,
        slug: products.slug,
        image: products.image,
        price: products.price,
        currency: products.currency,
        status: products.status,
      },
    })
    .from(wishlists)
    .innerJoin(products, eq(wishlists.productId, products.id))
    .where(eq(wishlists.customerId, customer.id))
    .orderBy(desc(wishlists.createdAt));
}

export async function addToWishlist(productId: number) {
  const customer = await getSessionCustomer();
  if (!customer) return { success: false, message: "Not authenticated." };

  const existing = await db
    .select({ id: wishlists.id })
    .from(wishlists)
    .where(and(eq(wishlists.customerId, customer.id), eq(wishlists.productId, productId)))
    .limit(1);

  if (existing.length > 0) {
    return { success: false, message: "Already in wishlist." };
  }

  await db.insert(wishlists).values({
    customerId: customer.id,
    productId,
  });

  revalidatePath("/account/wishlist");
  return { success: true, message: "Added to wishlist." };
}

export async function removeFromWishlist(wishlistId: number) {
  const customer = await getSessionCustomer();
  if (!customer) return { success: false, message: "Not authenticated." };

  await db
    .delete(wishlists)
    .where(and(eq(wishlists.id, wishlistId), eq(wishlists.customerId, customer.id)));

  revalidatePath("/account/wishlist");
  return { success: true, message: "Removed from wishlist." };
}

export async function isInWishlist(productId: number) {
  const customer = await getSessionCustomer();
  if (!customer) return false;

  const existing = await db
    .select({ id: wishlists.id })
    .from(wishlists)
    .where(and(eq(wishlists.customerId, customer.id), eq(wishlists.productId, productId)))
    .limit(1);

  return existing.length > 0;
}
