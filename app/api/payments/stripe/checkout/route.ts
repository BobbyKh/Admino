import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { carts, cartItems, orders, orderItems, paymentConfigurations, products, settings } from "@/lib/db/schema";
import { getResolvedSite } from "@/lib/site-context";
import { getStripeForSite } from "@/lib/commerce/stripe";
import { getQuantityUnitPrice } from "@/lib/commerce/pricing";
import { inventoryExpiry, ONLINE_RESERVATION_MINUTES, releaseInventoryReservation, reserveInventory } from "@/lib/commerce/inventory";
import { calculateCommerceTotals } from "@/lib/commerce/totals";
import { z } from "zod";
import { recordPromotionRedemption } from "@/lib/commerce/redemptions";
import { getSessionCustomer } from "@/lib/customer-auth";

export async function POST(request: NextRequest) {
  let pendingOrderId: number | null = null;
  try {
    const payload = z.object({ token: z.string().uuid(), customer: z.record(z.string(), z.unknown()) }).safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json({ error: "Cart token is required." }, { status: 400 });
    }
    const { token, customer } = payload.data;
    const customerInput = z.object({ email: z.string().email(), customerName: z.string().min(2).max(120), phone: z.string().min(6).max(40), addressLine1: z.string().min(3).max(180), addressLine2: z.string().max(180).optional().default(""), city: z.string().min(2).max(80), state: z.string().max(80).optional().default(""), postalCode: z.string().max(30).optional().default(""), country: z.string().min(2).max(80), deliveryNotes: z.string().max(500).optional().default("") }).safeParse(customer);
    if (!customerInput.success) return NextResponse.json({ error: customerInput.error.issues[0]?.message ?? "Invalid checkout details." }, { status: 400 });

    const site = await getResolvedSite();
    if (!site) {
      return NextResponse.json({ error: "Site not found." }, { status: 404 });
    }
    const siteId = site.id;

    const stripe = await getStripeForSite(siteId);
    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured for this store." }, { status: 400 });
    }

    const [configuration] = await db
      .select()
      .from(paymentConfigurations)
      .where(and(
        eq(paymentConfigurations.siteId, siteId),
        eq(paymentConfigurations.provider, "stripe"),
        eq(paymentConfigurations.enabled, true)
      ));

    if (!configuration) {
      return NextResponse.json({ error: "Stripe payment is not enabled." }, { status: 400 });
    }

    const [cart] = await db
      .select()
      .from(carts)
      .where(and(eq(carts.token, token), eq(carts.siteId, siteId)));

    if (!cart) {
      return NextResponse.json({ error: "Cart not found." }, { status: 404 });
    }

    const items = await db
      .select({
        id: cartItems.id,
        quantity: cartItems.quantity,
        selectedOptions: cartItems.selectedOptions,
        productId: products.id,
        slug: products.slug,
        title: products.title,
        image: products.image,
        category: products.category,
        retailPrice: products.price,
        wholesaleTiers: products.wholesaleTiers,
        currency: products.currency,
        inventoryQuantity: products.inventoryQuantity,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(and(eq(cartItems.cartId, cart.id), eq(products.siteId, siteId), eq(products.status, "active")));

    const pricedItems = items.map((item) => ({
      ...item,
      price: getQuantityUnitPrice(item.retailPrice, item.wholesaleTiers, item.quantity),
    }));

    if (pricedItems.length === 0) {
      return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
    }
    if (pricedItems.some((item) => item.currency.toLowerCase() !== cart.currency.toLowerCase())) return NextResponse.json({ error: "Cart products must use one currency." }, { status: 400 });

    for (const item of pricedItems) {
      if (item.inventoryQuantity < item.quantity) {
        return NextResponse.json({
          error: `${item.title} is no longer available in that quantity.`,
        }, { status: 400 });
      }
    }

    const baseUrl = site.domain ? `https://${site.domain}` : request.nextUrl.origin;
    const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/cart`;

    const totals = await calculateCommerceTotals({ siteId, items: pricedItems, promotionCode: cart.promotionCode, email: customerInput.data.email, requireCustomerEligibility: true });
    if (totals.promotionError) return NextResponse.json({ error: totals.promotionError }, { status: 400 });
    const stripeItems = buildStripeItems(pricedItems, totals.discountAmount, totals.shippingAmount, totals.taxAmount, cart.currency);

    const [prefixSetting] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(and(eq(settings.siteId, siteId), eq(settings.key, "commerce_order_prefix")));
    const prefix = prefixSetting?.value?.replace(/[^A-Z0-9-]/gi, "").slice(0, 12).toUpperCase() || "ORD";
    const orderNumber = `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const sessionCustomer = await getSessionCustomer();
    const customerId = sessionCustomer?.siteId === siteId && sessionCustomer.email.toLowerCase() === customerInput.data.email.toLowerCase() ? sessionCustomer.id : null;

    const pendingOrder = await db.transaction(async (tx) => {
      await reserveInventory(tx, siteId, pricedItems);
      const reservedAt = new Date().toISOString();
      const [order] = await tx.insert(orders).values({
        siteId,
        customerId,
        orderNumber,
        email: customerInput.data.email.toLowerCase(),
        customerName: customerInput.data.customerName,
        phone: customerInput.data.phone,
        addressLine1: customerInput.data.addressLine1,
        addressLine2: customerInput.data.addressLine2 || null,
        city: customerInput.data.city,
        state: customerInput.data.state || null,
        postalCode: customerInput.data.postalCode || null,
        country: customerInput.data.country,
        deliveryNotes: customerInput.data.deliveryNotes || null,
        currency: cart.currency,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        shippingAmount: totals.shippingAmount,
        taxAmount: totals.taxAmount,
        total: totals.total,
        promotionId: totals.promotion?.id ?? null,
        promotionCode: totals.promotion?.code ?? null,
        promotionSnapshot: totals.promotion ? JSON.stringify(totals.promotion) : null,
        status: "pending",
        paymentStatus: "payment_pending",
        paymentProvider: "stripe",
        providerPaymentId: null,
        inventoryStatus: "reserved",
        inventoryReservedAt: reservedAt,
        inventoryExpiresAt: inventoryExpiry(ONLINE_RESERVATION_MINUTES),
        updatedAt: reservedAt,
      }).returning();
      await tx.insert(orderItems).values(pricedItems.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        title: item.title,
        selectedOptions: item.selectedOptions,
        quantity: item.quantity,
        unitPrice: item.price,
      })));
      if (totals.promotion) await recordPromotionRedemption(tx, { siteId, promotionId: totals.promotion.id, orderId: order.id, email: customerInput.data.email.toLowerCase(), amount: totals.discountAmount });
      return order;
    });
    pendingOrderId = pendingOrder.id;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      expires_at: Math.floor(Date.now() / 1000) + ONLINE_RESERVATION_MINUTES * 60,
      line_items: stripeItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        siteId: String(siteId),
        orderId: String(pendingOrder.id),
        orderNumber,
        cartToken: token,
      },
      payment_intent_data: {
        metadata: {
          siteId: String(siteId),
          orderId: String(pendingOrder.id),
          orderNumber,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (pendingOrderId) {
      await releaseInventoryReservation(pendingOrderId).catch((releaseError) => { console.error("[Stripe Checkout] Failed to release inventory:", releaseError); return false; });
    }
    console.error("[Stripe Checkout]", error);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}

function buildStripeItems(items: Array<{ productId: number; title: string; image: string | null; price: number; quantity: number }>, discount: number, shipping: number, tax: number, currency: string): Stripe.Checkout.SessionCreateParams.LineItem[] {
  let remainingDiscount = discount;
  const lines: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const item of items) {
    const lineTotal = item.price * item.quantity;
    const lineDiscount = Math.min(lineTotal, remainingDiscount);
    remainingDiscount -= lineDiscount;
    const amount = lineTotal - lineDiscount;
    if (amount > 0) lines.push({ price_data: { currency: currency.toLowerCase(), product_data: { name: `${item.title} x ${item.quantity}`, ...(item.image ? { images: [item.image] } : {}), metadata: { productId: String(item.productId) } }, unit_amount: amount }, quantity: 1 });
  }
  if (shipping > 0) lines.push({ price_data: { currency: currency.toLowerCase(), product_data: { name: "Shipping" }, unit_amount: shipping }, quantity: 1 });
  if (tax > 0) lines.push({ price_data: { currency: currency.toLowerCase(), product_data: { name: "Tax" }, unit_amount: tax }, quantity: 1 });
  return lines;
}
