"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { isTestPaymentProvider, type TestPaymentProvider } from "@/lib/commerce/providers";
import { db } from "@/lib/db";
import { orderItems, orders, paymentConfigurations, products, settings } from "@/lib/db/schema";
import { getCurrentAdminSiteId } from "@/lib/tenant-access";
import { decryptCommerceSecrets, encryptCommerceSecrets } from "@/lib/commerce/secrets";

const productSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens."),
  description: z.string().trim().max(2000).optional().default(""),
  image: z.string().trim().url().optional().or(z.literal("")),
  category: z.string().trim().max(80).optional().default(""),
  sizes: z.string().trim().max(500).optional().default(""),
  colors: z.string().trim().max(500).optional().default(""),
  price: z.coerce.number().int().min(0),
  currency: z.string().trim().toLowerCase().length(3, "Currency must be a three-letter code, such as USD."),
  inventoryQuantity: z.coerce.number().int().min(0),
  status: z.enum(["draft", "active", "archived"]),
  featured: z.boolean(),
});

const orderStatusSchema = z.enum(["pending", "paid", "fulfilled", "cancelled"]);

async function getCommerceSiteId() {
  await requireRole("admin");
  return getCurrentAdminSiteId();
}

function productInput(formData: FormData) {
  return productSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    image: formData.get("image") ?? "",
    category: formData.get("category") ?? "",
    sizes: formData.get("sizes") ?? "",
    colors: formData.get("colors") ?? "",
    price: formData.get("price"),
    currency: formData.get("currency") ?? "usd",
    inventoryQuantity: formData.get("inventoryQuantity") ?? 0,
    status: formData.get("status") ?? "draft",
    featured: formData.get("featured") === "on",
  });
}

function revalidateCommerce() {
  revalidatePath("/admin/commerce");
  revalidatePath("/admin/commerce/products");
  revalidatePath("/admin/commerce/orders");
  revalidatePath("/admin/commerce/payments");
  revalidatePath("/", "layout");
}

export async function listProducts() {
  const siteId = await getCommerceSiteId();
  return db.select().from(products).where(eq(products.siteId, siteId)).orderBy(desc(products.createdAt));
}

export async function createProduct(formData: FormData) {
  const siteId = await getCommerceSiteId();
  const parsed = productInput(formData);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid product.");

  const product = parsed.data;
  await db.insert(products).values({
    siteId,
    ...product,
    description: product.description || null,
    image: product.image || null,
    category: product.category || null,
    sizes: toOptionJson(product.sizes),
    colors: toOptionJson(product.colors),
    updatedAt: new Date().toISOString(),
  });
  revalidateCommerce();
}

export async function updateProduct(productId: number, formData: FormData) {
  const siteId = await getCommerceSiteId();
  const parsed = productInput(formData);
  if (!Number.isInteger(productId) || productId < 1) throw new Error("Invalid product.");
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid product.");

  const product = parsed.data;
  await db.update(products).set({
    ...product,
    description: product.description || null,
    image: product.image || null,
    category: product.category || null,
    sizes: toOptionJson(product.sizes),
    colors: toOptionJson(product.colors),
    updatedAt: new Date().toISOString(),
  }).where(and(eq(products.id, productId), eq(products.siteId, siteId)));
  revalidateCommerce();
}

function toOptionJson(value: string) {
  const options = [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
  return options.length ? JSON.stringify(options) : null;
}

export async function deleteProduct(productId: number) {
  const siteId = await getCommerceSiteId();
  if (!Number.isInteger(productId) || productId < 1) throw new Error("Invalid product.");
  await db.delete(products).where(and(eq(products.id, productId), eq(products.siteId, siteId)));
  revalidateCommerce();
}

export async function listPaymentConfigurations() {
  const siteId = await getCommerceSiteId();
  return db.select().from(paymentConfigurations).where(eq(paymentConfigurations.siteId, siteId));
}

const commerceSettingKeys = ["commerce_currency", "commerce_tax_rate", "commerce_shipping_name", "commerce_shipping_price", "commerce_order_prefix"] as const;

export async function getCommerceSettings() {
  const siteId = await getCommerceSiteId();
  const rows = await db.select().from(settings).where(eq(settings.siteId, siteId));
  const values = new Map(rows.map((row) => [row.key, row.value]));
  return {
    currency: values.get("commerce_currency") ?? "usd",
    taxRate: values.get("commerce_tax_rate") ?? "0",
    shippingName: values.get("commerce_shipping_name") ?? "Standard delivery",
    shippingPrice: values.get("commerce_shipping_price") ?? "0",
    orderPrefix: values.get("commerce_order_prefix") ?? "ORD",
  };
}

export async function updateCommerceSettings(formData: FormData) {
  const siteId = await getCommerceSiteId();
  const input = z.object({
    currency: z.string().trim().toLowerCase().length(3),
    taxRate: z.coerce.number().min(0).max(100),
    shippingName: z.string().trim().min(1).max(80),
    shippingPrice: z.coerce.number().int().min(0),
    orderPrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,12}$/),
  }).safeParse({ currency: formData.get("currency"), taxRate: formData.get("taxRate"), shippingName: formData.get("shippingName"), shippingPrice: formData.get("shippingPrice"), orderPrefix: formData.get("orderPrefix") });
  if (!input.success) throw new Error(input.error.issues[0]?.message ?? "Invalid commerce settings.");
  const values = [input.data.currency, String(input.data.taxRate), input.data.shippingName, String(input.data.shippingPrice), input.data.orderPrefix];
  const now = new Date().toISOString();
  await Promise.all(commerceSettingKeys.map((key, index) => db.insert(settings).values({ siteId, key, value: values[index], updatedAt: now }).onConflictDoUpdate({ target: [settings.key, settings.siteId], set: { value: values[index], updatedAt: now } })));
  revalidateCommerce();
}

function paymentConfigurationInput(formData: FormData) {
  const provider = String(formData.get("provider") ?? "");
  if (!isTestPaymentProvider(provider)) throw new Error("Unsupported test payment provider.");
  const testReference = String(formData.get("testReference") ?? "").trim().slice(0, 120);
  const merchantId = String(formData.get("merchantId") ?? "").trim().slice(0, 120);
  const publicKey = String(formData.get("publicKey") ?? "").trim().slice(0, 240);
  const qrImage = String(formData.get("qrImage") ?? "").trim();
  const qrInstructions = String(formData.get("qrInstructions") ?? "").trim().slice(0, 500);
  if (qrImage && !z.string().url().safeParse(qrImage).success) throw new Error("QR image must be a valid URL.");
  return {
    provider,
    enabled: formData.get("enabled") === "on",
    accountId: testReference || null,
    settings: JSON.stringify({
      mode: "test",
      testReference: testReference || null,
      merchantId: merchantId || null,
      publicKey: publicKey || null,
      qrImage: qrImage || null,
      qrInstructions: qrInstructions || null,
    }),
  };
}

function paymentSecretInput(provider: TestPaymentProvider, formData: FormData) {
  const fields: Record<TestPaymentProvider, readonly string[]> = {
    esewa: ["clientSecret", "secretKey"],
    khalti: ["secretKey"],
    stripe: ["secretKey", "webhookSecret"],
    qr: [],
  };
  return Object.fromEntries(fields[provider].map((field) => [field, String(formData.get(field) ?? "").trim()]).filter(([, value]) => value));
}

async function savePaymentSecrets(siteId: number, provider: TestPaymentProvider, formData: FormData) {
  const updates = paymentSecretInput(provider, formData);
  if (Object.keys(updates).length === 0) return;
  const key = `commerce_payment_${provider}_secrets`;
  const [existing] = await db.select({ value: settings.value }).from(settings).where(and(eq(settings.siteId, siteId), eq(settings.key, key)));
  let current: Record<string, string> = {};
  if (existing?.value) current = decryptCommerceSecrets(existing.value);
  const value = encryptCommerceSecrets({ ...current, ...updates });
  await db.insert(settings).values({ siteId, key, value, updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: [settings.key, settings.siteId], set: { value, updatedAt: new Date().toISOString() } });
}

export async function createPaymentConfiguration(formData: FormData) {
  const siteId = await getCommerceSiteId();
  const configuration = paymentConfigurationInput(formData);
  await db.insert(paymentConfigurations).values({ siteId, ...configuration, updatedAt: new Date().toISOString() });
  await savePaymentSecrets(siteId, configuration.provider as TestPaymentProvider, formData);
  revalidateCommerce();
}

export async function updatePaymentConfiguration(provider: TestPaymentProvider, formData: FormData) {
  const siteId = await getCommerceSiteId();
  if (!isTestPaymentProvider(provider)) throw new Error("Unsupported test payment provider.");
  const configuration = paymentConfigurationInput(formData);
  if (configuration.provider !== provider) throw new Error("Provider cannot be changed.");
  await db.update(paymentConfigurations).set({
    enabled: configuration.enabled,
    accountId: configuration.accountId,
    settings: configuration.settings,
    updatedAt: new Date().toISOString(),
  }).where(and(eq(paymentConfigurations.siteId, siteId), eq(paymentConfigurations.provider, provider)));
  await savePaymentSecrets(siteId, provider, formData);
  revalidateCommerce();
}

export async function getPaymentSecretStatus() {
  const siteId = await getCommerceSiteId();
  const providers: TestPaymentProvider[] = ["stripe", "khalti", "esewa", "qr"];
  const result: Partial<Record<TestPaymentProvider, string[]>> = {};
  for (const provider of providers) {
    const [row] = await db.select({ value: settings.value }).from(settings).where(and(eq(settings.siteId, siteId), eq(settings.key, `commerce_payment_${provider}_secrets`)));
    if (row?.value) result[provider] = Object.keys(decryptCommerceSecrets(row.value));
  }
  return result;
}

export async function deletePaymentConfiguration(provider: TestPaymentProvider) {
  const siteId = await getCommerceSiteId();
  if (!isTestPaymentProvider(provider)) throw new Error("Unsupported test payment provider.");
  await db.delete(paymentConfigurations).where(and(eq(paymentConfigurations.siteId, siteId), eq(paymentConfigurations.provider, provider)));
  await db.delete(settings).where(and(eq(settings.siteId, siteId), eq(settings.key, `commerce_payment_${provider}_secrets`)));
  revalidateCommerce();
}

export async function listOrders() {
  const siteId = await getCommerceSiteId();
  return db.select().from(orders).where(eq(orders.siteId, siteId)).orderBy(desc(orders.createdAt));
}

export async function updateOrderStatus(orderId: number, formData: FormData) {
  const siteId = await getCommerceSiteId();
  if (!Number.isInteger(orderId) || orderId < 1) throw new Error("Invalid order.");
  const status = orderStatusSchema.safeParse(formData.get("status"));
  if (!status.success) throw new Error("Invalid order status.");
  await db.update(orders).set({ status: status.data, updatedAt: new Date().toISOString() })
    .where(and(eq(orders.id, orderId), eq(orders.siteId, siteId)));
  revalidateCommerce();
}

async function getTenantOrder(orderId: number) {
  const siteId = await getCommerceSiteId();
  if (!Number.isInteger(orderId) || orderId < 1) throw new Error("Invalid order.");
  const [order] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.siteId, siteId)));
  if (!order) throw new Error("Order not found.");
  return order;
}

export async function approveOrderPayment(orderId: number) {
  const order = await getTenantOrder(orderId);
  if (order.status !== "pending" || !["awaiting_verification", "payment_pending"].includes(order.paymentStatus)) throw new Error("This order cannot be approved.");
  await db.update(orders).set({ status: "paid", paymentStatus: "paid", updatedAt: new Date().toISOString() }).where(eq(orders.id, order.id));
  revalidateCommerce();
}

export async function rejectOrderPayment(orderId: number) {
  const order = await getTenantOrder(orderId);
  if (order.status !== "pending") throw new Error("Only pending orders can be rejected.");
  await db.transaction(async (tx) => {
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    for (const item of items) {
      if (item.productId) await tx.update(products).set({ inventoryQuantity: sql`${products.inventoryQuantity} + ${item.quantity}`, updatedAt: new Date().toISOString() }).where(eq(products.id, item.productId));
    }
    await tx.update(orders).set({ status: "cancelled", paymentStatus: "failed", updatedAt: new Date().toISOString() }).where(eq(orders.id, order.id));
  });
  revalidateCommerce();
}

export async function fulfillOrder(orderId: number) {
  const order = await getTenantOrder(orderId);
  if (order.status !== "paid" || order.paymentStatus !== "paid") throw new Error("Approve payment before marking an order delivered.");
  await db.update(orders).set({ status: "fulfilled", updatedAt: new Date().toISOString() }).where(eq(orders.id, order.id));
  revalidateCommerce();
}
