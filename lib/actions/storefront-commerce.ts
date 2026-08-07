"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { carts, cartItems, orderItems, orders, paymentConfigurations, products, settings } from "@/lib/db/schema";
import { getResolvedSiteId } from "@/lib/site-context";
import { isTestPaymentProvider, testPaymentProviderRegistry, type TestPaymentProvider } from "@/lib/commerce/providers";

const tokenSchema = z.string().uuid();

async function getStoreSiteId() {
  const siteId = await getResolvedSiteId();
  if (!siteId) throw new Error("Store not found.");
  return siteId;
}

async function getCartForSite(token: string, siteId: number) {
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return null;
  const [cart] = await db.select().from(carts).where(and(eq(carts.token, parsed.data), eq(carts.siteId, siteId)));
  return cart ?? null;
}

export async function getStoreCart(token: string | null) {
  const siteId = await getStoreSiteId();
  if (!token) return { items: [], subtotal: 0, currency: "usd" };
  const cart = await getCartForSite(token, siteId);
  if (!cart) return { items: [], subtotal: 0, currency: "usd" };
  const items = await db.select({ id: cartItems.id, quantity: cartItems.quantity, productId: products.id, title: products.title, image: products.image, price: cartItems.unitPrice, inventoryQuantity: products.inventoryQuantity }).from(cartItems).innerJoin(products, eq(cartItems.productId, products.id)).where(and(eq(cartItems.cartId, cart.id), eq(products.siteId, siteId)));
  return { items, subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0), currency: cart.currency };
}

export async function addStoreCartItem(token: string | null, productId: number) {
  const siteId = await getStoreSiteId();
  if (!Number.isInteger(productId) || productId < 1) throw new Error("Invalid product.");
  const [product] = await db.select().from(products).where(and(eq(products.id, productId), eq(products.siteId, siteId), eq(products.status, "active")));
  if (!product) throw new Error("This product is no longer available.");
  if (product.inventoryQuantity < 1) throw new Error("This product is out of stock.");

  let cart = token ? await getCartForSite(token, siteId) : null;
  if (!cart) {
    const [created] = await db.insert(carts).values({ siteId, token: crypto.randomUUID(), currency: product.currency, updatedAt: new Date().toISOString() }).returning();
    cart = created;
  }
  const [existing] = await db.select().from(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, product.id)));
  const quantity = (existing?.quantity ?? 0) + 1;
  if (quantity > product.inventoryQuantity) throw new Error("Only the available quantity can be added.");
  if (existing) await db.update(cartItems).set({ quantity, unitPrice: product.price }).where(eq(cartItems.id, existing.id));
  else await db.insert(cartItems).values({ cartId: cart.id, productId: product.id, quantity: 1, unitPrice: product.price });
  await db.update(carts).set({ updatedAt: new Date().toISOString() }).where(eq(carts.id, cart.id));
  return { token: cart.token };
}

export async function updateStoreCartItem(token: string, productId: number, quantity: number) {
  const siteId = await getStoreSiteId();
  const cart = await getCartForSite(token, siteId);
  if (!cart) throw new Error("Cart not found.");
  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 0) throw new Error("Invalid cart update.");
  const [item] = await db.select().from(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)));
  if (!item) throw new Error("Cart item not found.");
  if (quantity === 0) await db.delete(cartItems).where(eq(cartItems.id, item.id));
  else {
    const [product] = await db.select().from(products).where(and(eq(products.id, productId), eq(products.siteId, siteId), eq(products.status, "active")));
    if (!product || quantity > product.inventoryQuantity) throw new Error("Requested quantity is unavailable.");
    await db.update(cartItems).set({ quantity, unitPrice: product.price }).where(eq(cartItems.id, item.id));
  }
  await db.update(carts).set({ updatedAt: new Date().toISOString() }).where(eq(carts.id, cart.id));
}

export async function getStorePaymentMethods() {
  const siteId = await getStoreSiteId();
  const configurations = await db.select().from(paymentConfigurations).where(and(eq(paymentConfigurations.siteId, siteId), eq(paymentConfigurations.enabled, true)));
  return configurations.flatMap((configuration) => {
    if (!isTestPaymentProvider(configuration.provider)) return [];
    const provider: TestPaymentProvider = configuration.provider;
    const settings = parsePaymentSettings(configuration.settings);
    return [{ id: provider, label: testPaymentProviderRegistry[provider].label, qrImage: provider === "qr" ? settings.qrImage : null, instructions: provider === "qr" ? settings.qrInstructions : null }];
  });
}

export async function completeStoreCheckout(token: string, formData: FormData) {
  const siteId = await getStoreSiteId();
  const cart = await getCartForSite(token, siteId);
  if (!cart) throw new Error("Cart not found.");
  const input = z.object({ email: z.string().trim().email("Enter a valid email address."), provider: z.string(), paymentReference: z.string().trim().max(120).optional().default("") }).safeParse({ email: formData.get("email"), provider: formData.get("provider"), paymentReference: formData.get("paymentReference") ?? "" });
  if (!input.success) throw new Error(input.error.issues[0]?.message ?? "Invalid checkout details.");
  if (!isTestPaymentProvider(input.data.provider)) throw new Error("Invalid payment method.");
  const [configuration] = await db.select().from(paymentConfigurations).where(and(eq(paymentConfigurations.siteId, siteId), eq(paymentConfigurations.provider, input.data.provider), eq(paymentConfigurations.enabled, true)));
  if (!configuration) throw new Error("That payment method is unavailable.");
  if (input.data.provider === "qr" && !input.data.paymentReference) throw new Error("Enter the payment reference after completing the QR payment.");
  const items = await getStoreCart(token);
  if (items.items.length === 0) throw new Error("Your cart is empty.");

  const [prefixSetting] = await db.select({ value: settings.value }).from(settings).where(and(eq(settings.siteId, siteId), eq(settings.key, "commerce_order_prefix")));
  const prefix = prefixSetting?.value?.replace(/[^A-Z0-9-]/gi, "").slice(0, 12).toUpperCase() || "ORD";
  const orderNumber = `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  await db.transaction(async (tx) => {
    for (const item of items.items) {
      const [product] = await tx.select().from(products).where(and(eq(products.id, item.productId), eq(products.siteId, siteId), eq(products.status, "active")));
      if (!product || product.inventoryQuantity < item.quantity) throw new Error(`${item.title} is no longer available in that quantity.`);
      await tx.update(products).set({ inventoryQuantity: product.inventoryQuantity - item.quantity, updatedAt: new Date().toISOString() }).where(and(eq(products.id, product.id), eq(products.siteId, siteId)));
    }
    const paymentStatus = input.data.provider === "qr" ? "awaiting_verification" : "payment_pending";
    const [order] = await tx.insert(orders).values({ siteId, orderNumber, email: input.data.email, currency: cart.currency, subtotal: items.subtotal, total: items.subtotal, status: "pending", paymentStatus, paymentProvider: input.data.provider, providerPaymentId: input.data.paymentReference || null, updatedAt: new Date().toISOString() }).returning();
    await tx.insert(orderItems).values(items.items.map((item) => ({ orderId: order.id, productId: item.productId, title: item.title, quantity: item.quantity, unitPrice: item.price })));
    await tx.delete(carts).where(eq(carts.id, cart.id));
  });
  revalidatePath("/", "layout");
  return { orderNumber, provider: input.data.provider };
}

function parsePaymentSettings(raw: string | null) {
  try {
    const value = JSON.parse(raw ?? "{}") as Record<string, unknown>;
    return {
      qrImage: typeof value.qrImage === "string" ? value.qrImage : null,
      qrInstructions: typeof value.qrInstructions === "string" ? value.qrInstructions : null,
    };
  } catch { return { qrImage: null, qrInstructions: null }; }
}
