import { createHmac, timingSafeEqual } from "crypto";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, products, subscriptions, plans } from "@/lib/db/schema";
import { dispatchWebhook } from "@/lib/webhooks";
import { sendOrderPaymentStatusEmail } from "@/lib/email";

/**
 * Stripe webhook handler for subscription lifecycle events.
 *
 * Expected Stripe events:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.paid
 * - invoice.payment_failed
 * - checkout.session.completed
 *
 * Configure STRIPE_WEBHOOK_SECRET in .env.local with your Stripe webhook endpoint secret.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Verify webhook signature
  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = verifyStripeSignature(body, signature, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ─── Event Handlers ──────────────────────────────────────────────────────────

async function handleSubscriptionCheckoutCompleted(data: Record<string, unknown>) {
  const metadata = (data.metadata ?? {}) as Record<string, string>;
  const siteId = metadata.siteId ? parseInt(metadata.siteId, 10) : null;
  const planId = metadata.planId ? parseInt(metadata.planId, 10) : null;
  const stripeSubscriptionId = data.subscription as string | null;
  const stripeCustomerId = data.customer as string | null;

  if (!siteId) return;
  const fallbackPlanId = planId ?? (await resolvePlanIdFromPrice(data, null)) ?? 1;

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.siteId, siteId))
    .limit(1);

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        planId: planId ?? existing.planId,
        status: "active",
        stripeSubscriptionId: stripeSubscriptionId ?? existing.stripeSubscriptionId,
        stripeCustomerId: stripeCustomerId ?? existing.stripeCustomerId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(subscriptions.id, existing.id));
  } else {
    await db.insert(subscriptions).values({
      siteId,
      planId: fallbackPlanId,
      status: "active",
      stripeSubscriptionId,
      stripeCustomerId,
      updatedAt: new Date().toISOString(),
    });
  }
}

async function handleCheckoutCompleted(data: Record<string, unknown>) {
  const metadata = (data.metadata ?? {}) as Record<string, string>;

  // Subscription checkout (Admino SaaS plans): mode === "subscription"
  if (data.mode === "subscription" || metadata.planId) {
    await handleSubscriptionCheckoutCompleted(data);
    return;
  }

  const orderId = metadata.orderId ? parseInt(metadata.orderId, 10) : null;
  if (!orderId) return;

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return;
  if (order.paymentStatus === "paid") return;

  const stripePaymentIntentId = data.payment_intent as string | null;
  const stripeCustomerId = data.customer as string | null;

  await db
    .update(orders)
    .set({
      status: "paid",
      paymentStatus: "paid",
      providerPaymentId: stripePaymentIntentId ?? data.id as string ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(orders.id, orderId));

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  void sendOrderPaymentStatusEmail({ ...order, status: "paid", paymentStatus: "paid" }, items, "paid").catch((error) =>
    console.error("Failed to send order paid email:", error)
  );

  void dispatchWebhook(order.siteId, "order.paid", {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      email: order.email,
      customerName: order.customerName,
      total: order.total,
      currency: order.currency,
      status: "paid",
      paymentStatus: "paid",
      stripePaymentIntentId,
      stripeCustomerId,
      items: items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    },
  }).catch(() => {});

  // Restore inventory for items in cancelled orders that are now paid
  for (const item of items) {
    if (item.productId) {
      await db
        .update(products)
        .set({
          updatedAt: new Date().toISOString(),
        })
        .where(eq(products.id, item.productId));
    }
  }
}

async function handleSubscriptionUpdate(data: Record<string, unknown>) {
  const stripeSubscriptionId = data.id as string;
  const status = mapStripeStatus(data.status as string);
  const currentPeriodStart = data.current_period_start as number | null;
  const currentPeriodEnd = data.current_period_end as number | null;
  const cancelAt = data.cancel_at as number | null;
  const customerId = data.customer as string | null;
  const metadata = (data.metadata ?? {}) as Record<string, string>;
  const siteIdFromMetadata = metadata.siteId ? parseInt(metadata.siteId, 10) : null;
  const planIdFromMetadata = metadata.planId ? parseInt(metadata.planId, 10) : null;

  // Find subscription by stripe ID
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);

  if (existing) {
    const planId = (await resolvePlanIdFromPrice(data, existing.planId)) ?? existing.planId;
    await db
      .update(subscriptions)
      .set({
        planId,
        status,
        currentPeriodStart: currentPeriodStart
          ? new Date(currentPeriodStart * 1000).toISOString()
          : existing.currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000).toISOString()
          : existing.currentPeriodEnd,
        cancelAt: cancelAt
          ? new Date(cancelAt * 1000).toISOString()
          : null,
        stripeCustomerId: customerId ?? existing.stripeCustomerId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(subscriptions.id, existing.id));

    // Dispatch webhook event
    const webhookEvent = status === "cancelled" ? "subscription.cancelled" : "subscription.updated";
    void dispatchWebhook(existing.siteId, webhookEvent, {
      subscription: {
        id: existing.id,
        stripeSubscriptionId,
        status,
        planId,
      },
    }).catch(() => {});
    return;
  }

  // No DB row yet — create one. Prefer metadata siteId; fall back to a
  // site whose customer matches this subscription's customer.
  let siteId = siteIdFromMetadata;
  if (!siteId && customerId) {
    const [byCustomer] = await db
      .select({ siteId: subscriptions.siteId })
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, customerId))
      .limit(1);
    siteId = byCustomer?.siteId ?? null;
  }
  if (!siteId) return;

  const planId = planIdFromMetadata ?? (await resolvePlanIdFromPrice(data, null)) ?? 1;

  const [created] = await db
    .insert(subscriptions)
    .values({
      siteId,
      planId,
      status,
      stripeSubscriptionId,
      stripeCustomerId: customerId,
      currentPeriodStart: currentPeriodStart
        ? new Date(currentPeriodStart * 1000).toISOString()
        : null,
      currentPeriodEnd: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : null,
      cancelAt: cancelAt ? new Date(cancelAt * 1000).toISOString() : null,
      updatedAt: new Date().toISOString(),
    })
    .returning();

  const webhookEvent = status === "cancelled" ? "subscription.cancelled" : "subscription.created";
  void dispatchWebhook(siteId, webhookEvent, {
    subscription: {
      id: created.id,
      stripeSubscriptionId,
      status,
      planId,
    },
  }).catch(() => {});
}

async function handleSubscriptionDeleted(data: Record<string, unknown>) {
  const stripeSubscriptionId = data.id as string;
  const customerId = data.customer as string | null;

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        status: "cancelled",
        cancelAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(subscriptions.id, existing.id));

    void dispatchWebhook(existing.siteId, "subscription.cancelled", {
      subscription: {
        id: existing.id,
        stripeSubscriptionId,
        status: "cancelled",
        planId: existing.planId,
      },
    }).catch(() => {});
    return;
  }

  // No linked row — try to cancel via the customer link.
  if (!customerId) return;
  const [byCustomer] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);
  if (byCustomer) {
    await db
      .update(subscriptions)
      .set({
        status: "cancelled",
        cancelAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(subscriptions.id, byCustomer.id));

    void dispatchWebhook(byCustomer.siteId, "subscription.cancelled", {
      subscription: {
        id: byCustomer.id,
        stripeSubscriptionId,
        status: "cancelled",
        planId: byCustomer.planId,
      },
    }).catch(() => {});
  }
}

async function handleInvoicePaid(data: Record<string, unknown>) {
  const subscriptionId = data.subscription as string | null;
  const customerId = data.customer as string | null;
  if (!subscriptionId) return;

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
    .limit(1);

  if (existing) {
    const currentPeriodEnd = data.period_end as number | null;
    await db
      .update(subscriptions)
      .set({
        status: "active",
        currentPeriodEnd: currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000).toISOString()
          : existing.currentPeriodEnd,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(subscriptions.id, existing.id));
    return;
  }

  // Unknown subscription — try to find the site by customer and link it.
  if (!customerId) return;
  const [byCustomer] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);
  if (!byCustomer) return;

  await db
    .update(subscriptions)
    .set({
      stripeSubscriptionId: subscriptionId,
      status: "active",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(subscriptions.id, byCustomer.id));
}

async function handleInvoicePaymentFailed(data: Record<string, unknown>) {
  const subscriptionId = data.subscription as string | null;
  if (!subscriptionId) return;

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
    .limit(1);

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        status: "past_due",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(subscriptions.id, existing.id));

    void dispatchWebhook(existing.siteId, "subscription.payment_failed", {
      subscription: {
        id: existing.id,
        stripeSubscriptionId: subscriptionId,
        status: "past_due",
        planId: existing.planId,
      },
    }).catch(() => {});
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Maps a Stripe subscription line-item price back to an internal plan.
 * Uses the price ID from the subscription's items array to find a plan with
 * a matching stripe_price_id. Returns null when no match exists.
 */
async function resolvePlanIdFromPrice(
  data: Record<string, unknown>,
  fallbackPlanId: number | null
): Promise<number | null> {
  const items = data.items as { data?: Array<{ price?: { id?: string } }> } | undefined;
  const priceId = items?.data?.[0]?.price?.id;
  if (priceId) {
    const [plan] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.stripePriceId, priceId))
      .limit(1);
    if (plan) return plan.id;
  }
  return fallbackPlanId;
}

function mapStripeStatus(
  stripeStatus: string
): "active" | "past_due" | "cancelled" | "trialing" {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
      return "cancelled";
    case "trialing":
      return "trialing";
    default:
      return "active";
  }
}

function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string
): { type: string; data: { object: Record<string, unknown> } } {
  const parts = signature.split(",").reduce(
    (acc, part) => {
      const [key, value] = part.split("=");
      if (key && value) acc[key] = value;
      return acc;
    },
    {} as Record<string, string>
  );

  const timestamp = parts["t"];
  const expectedSig = parts["v1"];

  if (!timestamp || !expectedSig) {
    throw new Error("Invalid signature format");
  }

  // Reject payloads older than 5 minutes
  const tolerance = 300;
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (age > tolerance) {
    throw new Error("Timestamp too old");
  }

  // Verify HMAC
  const signedPayload = `${timestamp}.${body}`;
  const expectedHash = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  if (
    expectedHash.length !== expectedSig.length ||
    !timingSafeEqual(Buffer.from(expectedHash), Buffer.from(expectedSig))
  ) {
    throw new Error("Signature mismatch");
  }

  // Parse the event (the body was verified, so we trust it)
  return JSON.parse(body) as {
    type: string;
    data: { object: Record<string, unknown> };
  };
}
