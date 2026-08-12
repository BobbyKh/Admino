"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { carts, cartItems, orderItems, orders, paymentConfigurations, products, settings } from "@/lib/db/schema";
import { getResolvedSiteId } from "@/lib/site-context";
import { isTestPaymentProvider, testPaymentProviderRegistry, type TestPaymentProvider } from "@/lib/commerce/providers";
import { sendOrderAdminAlert, sendOrderConfirmationEmail } from "@/lib/email";
import { dispatchWebhook } from "@/lib/webhooks";

const tokenSchema = z.string().uuid();
const selectedOptionsSchema = z.object({
  size: z.string().trim().max(40).optional(),
  color: z.string().trim().max(40).optional(),
});

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
  const items = await db.select({ id: cartItems.id, quantity: cartItems.quantity, selectedOptions: cartItems.selectedOptions, productId: products.id, slug: products.slug, title: products.title, image: products.image, price: cartItems.unitPrice, inventoryQuantity: products.inventoryQuantity }).from(cartItems).innerJoin(products, eq(cartItems.productId, products.id)).where(and(eq(cartItems.cartId, cart.id), eq(products.siteId, siteId)));
  return { items, subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0), currency: cart.currency };
}

export async function addStoreCartItem(token: string | null, productId: number, selectedOptions?: unknown) {
  const siteId = await getStoreSiteId();
  if (!Number.isInteger(productId) || productId < 1) throw new Error("Invalid product.");
  const [product] = await db.select().from(products).where(and(eq(products.id, productId), eq(products.siteId, siteId), eq(products.status, "active")));
  if (!product) throw new Error("This product is no longer available.");
  if (product.inventoryQuantity < 1) throw new Error("This product is out of stock.");
  const options = normalizeSelectedOptions(selectedOptions);
  const optionsKey = JSON.stringify(options);

  let cart = token ? await getCartForSite(token, siteId) : null;
  if (!cart) {
    const [created] = await db.insert(carts).values({ siteId, token: crypto.randomUUID(), currency: product.currency, updatedAt: new Date().toISOString() }).returning();
    cart = created;
  }
  const [existing] = await db.select().from(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, product.id), eq(cartItems.selectedOptions, optionsKey)));
  const quantity = (existing?.quantity ?? 0) + 1;
  if (quantity > product.inventoryQuantity) throw new Error("Only the available quantity can be added.");
  if (existing) await db.update(cartItems).set({ quantity, unitPrice: product.price }).where(eq(cartItems.id, existing.id));
  else await db.insert(cartItems).values({ cartId: cart.id, productId: product.id, selectedOptions: optionsKey, quantity: 1, unitPrice: product.price });
  await db.update(carts).set({ updatedAt: new Date().toISOString() }).where(eq(carts.id, cart.id));
  return { token: cart.token };
}

export async function updateStoreCartItem(token: string, cartItemId: number, quantity: number) {
  const siteId = await getStoreSiteId();
  const cart = await getCartForSite(token, siteId);
  if (!cart) throw new Error("Cart not found.");
  if (!Number.isInteger(cartItemId) || !Number.isInteger(quantity) || quantity < 0) throw new Error("Invalid cart update.");
  const [item] = await db.select().from(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.id, cartItemId)));
  if (!item) throw new Error("Cart item not found.");
  if (quantity === 0) await db.delete(cartItems).where(eq(cartItems.id, item.id));
  else {
    const [product] = await db.select().from(products).where(and(eq(products.id, item.productId), eq(products.siteId, siteId), eq(products.status, "active")));
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
    const modeLabel = provider === "esewa" ? ` (${settings.mode === "live" ? "Live" : "Test"})` : "";
    const instructions = provider === "qr" ? settings.qrInstructions : provider === "cod" ? settings.codInstructions : null;
    return [{ id: provider, label: `${testPaymentProviderRegistry[provider].label}${modeLabel}`, qrImage: provider === "qr" ? settings.qrImage : null, instructions }];
  });
}

export async function completeStoreCheckout(token: string, formData: FormData) {
  const siteId = await getStoreSiteId();
  const cart = await getCartForSite(token, siteId);
  if (!cart) throw new Error("Cart not found.");
  const input = z.object({
    email: z.string().trim().email("Enter a valid email address."),
    customerName: z.string().trim().min(2, "Enter your full name.").max(120),
    phone: z.string().trim().min(6, "Enter a valid phone number.").max(40),
    addressLine1: z.string().trim().min(3, "Enter your delivery address.").max(180),
    addressLine2: z.string().trim().max(180).optional().default(""),
    city: z.string().trim().min(2, "Enter your city.").max(80),
    state: z.string().trim().max(80).optional().default(""),
    postalCode: z.string().trim().max(30).optional().default(""),
    country: z.string().trim().min(2, "Enter your country.").max(80),
    deliveryNotes: z.string().trim().max(500).optional().default(""),
    provider: z.string(),
    paymentReference: z.string().trim().max(120).optional().default(""),
  }).safeParse({
    email: formData.get("email"),
    customerName: formData.get("customerName"),
    phone: formData.get("phone"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2") ?? "",
    city: formData.get("city"),
    state: formData.get("state") ?? "",
    postalCode: formData.get("postalCode") ?? "",
    country: formData.get("country"),
    deliveryNotes: formData.get("deliveryNotes") ?? "",
    provider: formData.get("provider"),
    paymentReference: formData.get("paymentReference") ?? "",
  });
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
  let createdOrderId = 0;
  await db.transaction(async (tx) => {
    for (const item of items.items) {
      const [product] = await tx.select().from(products).where(and(eq(products.id, item.productId), eq(products.siteId, siteId), eq(products.status, "active")));
      if (!product || product.inventoryQuantity < item.quantity) throw new Error(`${item.title} is no longer available in that quantity.`);
      await tx.update(products).set({ inventoryQuantity: product.inventoryQuantity - item.quantity, updatedAt: new Date().toISOString() }).where(and(eq(products.id, product.id), eq(products.siteId, siteId)));
    }
    const paymentStatus = input.data.provider === "qr" ? "awaiting_verification" : "payment_pending";
    const [order] = await tx.insert(orders).values({ siteId, orderNumber, email: input.data.email, customerName: input.data.customerName, phone: input.data.phone, addressLine1: input.data.addressLine1, addressLine2: input.data.addressLine2 || null, city: input.data.city, state: input.data.state || null, postalCode: input.data.postalCode || null, country: input.data.country, deliveryNotes: input.data.deliveryNotes || null, currency: cart.currency, subtotal: items.subtotal, total: items.subtotal, status: "pending", paymentStatus, paymentProvider: input.data.provider, providerPaymentId: input.data.paymentReference || null, updatedAt: new Date().toISOString() }).returning();
    createdOrderId = order.id;
    await tx.insert(orderItems).values(items.items.map((item) => ({ orderId: order.id, productId: item.productId, title: item.title, selectedOptions: item.selectedOptions, quantity: item.quantity, unitPrice: item.price })));
    await tx.delete(carts).where(eq(carts.id, cart.id));
  });
  const [createdOrder, createdItems] = await Promise.all([
    db.select().from(orders).where(and(eq(orders.id, createdOrderId), eq(orders.siteId, siteId))).then((rows) => rows[0]),
    db.select().from(orderItems).where(eq(orderItems.orderId, createdOrderId)),
  ]);
  if (createdOrder) {
    void Promise.allSettled([
      sendOrderConfirmationEmail(createdOrder, createdItems),
      sendOrderAdminAlert(createdOrder, createdItems),
      dispatchWebhook(siteId, "order.created", {
        order: {
          id: createdOrder.id,
          orderNumber: createdOrder.orderNumber,
          email: createdOrder.email,
          customerName: createdOrder.customerName,
          total: createdOrder.total,
          currency: createdOrder.currency,
          status: createdOrder.status,
          items: createdItems.map((item) => ({
            title: item.title,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      }),
    ]);
  }
  revalidatePath("/", "layout");
  return { orderNumber, provider: input.data.provider };
}

function parsePaymentSettings(raw: string | null) {
  try {
    const value = JSON.parse(raw ?? "{}") as Record<string, unknown>;
    return {
      qrImage: typeof value.qrImage === "string" ? value.qrImage : null,
      qrInstructions: typeof value.qrInstructions === "string" ? value.qrInstructions : null,
      codInstructions: typeof value.codInstructions === "string" ? value.codInstructions : null,
      mode: value.mode === "live" ? "live" : "test",
    };
  } catch { return { qrImage: null, qrInstructions: null, codInstructions: null, mode: "test" }; }
}

function normalizeSelectedOptions(input: unknown) {
  const parsed = selectedOptionsSchema.safeParse(input ?? {});
  if (!parsed.success) return {};
  return Object.fromEntries(Object.entries(parsed.data).filter(([, value]) => value && value.trim().length > 0));
}
