import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, subscriptions } from "@/lib/db/schema";
import { getPlatformStripe, resolvePlatformPriceId } from "@/lib/commerce/stripe";

export async function createSubscriptionCheckout(siteId: number, planSlug: string, baseUrl: string) {
  const [plan] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.slug, planSlug), eq(plans.active, true)))
    .limit(1);
  if (!plan) return { error: "Plan not found.", status: 404 } as const;

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.siteId, siteId))
    .limit(1);

  if (plan.price === 0) {
    if (existing) {
      await db
        .update(subscriptions)
        .set({ planId: plan.id, status: "active", updatedAt: new Date().toISOString() })
        .where(and(eq(subscriptions.id, existing.id), eq(subscriptions.siteId, siteId)));
    } else {
      await db.insert(subscriptions).values({ siteId, planId: plan.id, status: "active" });
    }
    return { free: true } as const;
  }

  const stripe = await getPlatformStripe();
  if (!stripe) return { error: "Stripe is not configured. Add STRIPE_SECRET_KEY.", status: 400 } as const;

  const priceId = await resolvePlatformPriceId(plan);
  if (!priceId) return { error: "Could not resolve a Stripe price for this plan.", status: 400 } as const;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: existing?.stripeCustomerId ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/admin/billing?subscribed=1`,
    cancel_url: `${baseUrl}/admin/billing`,
    subscription_data: {
      metadata: { siteId: String(siteId), planId: String(plan.id), planSlug: plan.slug },
    },
    metadata: {
      siteId: String(siteId),
      planId: String(plan.id),
      planSlug: plan.slug,
    },
  });

  return { url: session.url } as const;
}

export async function createSubscriptionPortal(siteId: number, baseUrl: string) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.siteId, siteId))
    .limit(1);
  if (!subscription?.stripeCustomerId && !subscription?.stripeSubscriptionId) {
    return { error: "No subscription to manage.", status: 400 } as const;
  }

  const stripe = await getPlatformStripe();
  if (!stripe) return { error: "Stripe is not configured.", status: 400 } as const;

  let customerId = subscription.stripeCustomerId ?? undefined;
  if (!customerId && subscription.stripeSubscriptionId) {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    if (stripeSubscription.customer) customerId = String(stripeSubscription.customer);
  }
  if (!customerId) return { error: "No Stripe customer for this site.", status: 400 } as const;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/admin/billing`,
  });
  return { url: session.url } as const;
}

export function getBillingBaseUrl(requestOrigin?: string) {
  const configured = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const value = configured || (process.env.NODE_ENV !== "production" ? requestOrigin || "http://localhost:3000" : "");
  if (!value) throw new Error("SITE_URL is required for billing in production.");
  const url = new URL(value);
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("SITE_URL must use HTTPS in production.");
  }
  return url.origin;
}
