import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { carts, cartItems, orders, orderItems, paymentConfigurations, products, settings } from "@/lib/db/schema";
import { getResolvedSite } from "@/lib/site-context";
import { getStripeForSite } from "@/lib/commerce/stripe";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json() as { token: string };
    if (!token) {
      return NextResponse.json({ error: "Cart token is required." }, { status: 400 });
    }

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
        productId: products.id,
        slug: products.slug,
        title: products.title,
        image: products.image,
        price: cartItems.unitPrice,
        inventoryQuantity: products.inventoryQuantity,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(and(eq(cartItems.cartId, cart.id), eq(products.siteId, siteId), eq(products.status, "active")));

    if (items.length === 0) {
      return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
    }

    for (const item of items) {
      if (item.inventoryQuantity < item.quantity) {
        return NextResponse.json({
          error: `${item.title} is no longer available in that quantity.`,
        }, { status: 400 });
      }
    }

    const baseUrl = site.domain ? `https://${site.domain}` : request.nextUrl.origin;
    const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/cart`;

    const stripeItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
      price_data: {
        currency: cart.currency.toLowerCase(),
        product_data: {
          name: item.title,
          ...(item.image ? { images: [item.image] } : {}),
          metadata: { productId: String(item.productId) },
        },
        unit_amount: item.price,
      },
      quantity: item.quantity,
    }));

    const [prefixSetting] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(and(eq(settings.siteId, siteId), eq(settings.key, "commerce_order_prefix")));
    const prefix = prefixSetting?.value?.replace(/[^A-Z0-9-]/gi, "").slice(0, 12).toUpperCase() || "ORD";
    const orderNumber = `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const [pendingOrder] = await db
      .insert(orders)
      .values({
        siteId,
        orderNumber,
        email: "",
        customerName: "",
        phone: "",
        addressLine1: "",
        city: "",
        country: "",
        currency: cart.currency,
        subtotal,
        total: subtotal,
        status: "pending",
        paymentStatus: "payment_pending",
        paymentProvider: "stripe",
        providerPaymentId: null,
        updatedAt: new Date().toISOString(),
      })
      .returning();

    await db.insert(orderItems).values(
      items.map((item) => ({
        orderId: pendingOrder.id,
        productId: item.productId,
        title: item.title,
        selectedOptions: "{}",
        quantity: item.quantity,
        unitPrice: item.price,
      }))
    );

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
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
    console.error("[Stripe Checkout]", error);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
