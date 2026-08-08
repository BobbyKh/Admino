import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, subscriptions } from "@/lib/db/schema";
import { getPlatformStripe, resolvePlatformPriceId } from "@/lib/commerce/stripe";
import { getSiteForRequest } from "@/lib/site-context";

/**
 * Creates a Stripe Checkout Session (mode: subscription) for the given
 * site + plan. This powers Admino's own SaaS plan checkout.
 *
 * Body: { planSlug: string, siteUrl?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { planSlug, siteUrl } = await request.json() as { planSlug: string; siteUrl?: string };
    if (!planSlug) {
      return NextResponse.json({ error: "Plan slug is required." }, { status: 400 });
    }

    const host = request.headers.get("x-request-host") ?? request.headers.get("host") ?? "localhost";
    const siteSlug = request.nextUrl.searchParams.get("site");
    const site = await getSiteForRequest(host, siteSlug);
    if (!site) {
      return NextResponse.json({ error: "Site not found." }, { status: 404 });
    }
    const siteId = site.id;

    const [plan] = await db
      .select()
      .from(plans)
      .where(and(eq(plans.slug, planSlug), eq(plans.active, true)))
      .limit(1);

    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    // Free plans don't need a Stripe checkout — activate directly.
    if (plan.price === 0) {
      const [existing] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.siteId, siteId))
        .limit(1);

      if (existing) {
        await db
          .update(subscriptions)
          .set({ planId: plan.id, status: "active", updatedAt: new Date().toISOString() })
          .where(eq(subscriptions.id, existing.id));
      } else {
        await db.insert(subscriptions).values({ siteId, planId: plan.id, status: "active" });
      }
      return NextResponse.json({ success: true, free: true });
    }

    const stripe = await getPlatformStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured. Add STRIPE_SECRET_KEY." }, { status: 400 });
    }

    const priceId = await resolvePlatformPriceId(plan);
    if (!priceId) {
      return NextResponse.json({ error: "Could not resolve a Stripe price for this plan." }, { status: 400 });
    }

    // Reuse an existing Stripe customer for this site when possible.
    const [existingSub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.siteId, siteId))
      .limit(1);
    const customerId = existingSub?.stripeCustomerId ?? undefined;

    const baseUrl = siteUrl ?? `${request.headers.get("x-forwarded-proto") ?? "https"}://${host}`;
    const successUrl = `${baseUrl}/admin/billing?subscribed=1`;
    const cancelUrl = `${baseUrl}/admin/billing`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: { siteId: String(siteId), planId: String(plan.id), planSlug: plan.slug },
      },
      metadata: {
        siteId: String(siteId),
        planId: String(plan.id),
        planSlug: plan.slug,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[Stripe Subscription Checkout]", error);
    return NextResponse.json(
      { error: "Failed to create subscription checkout." },
      { status: 500 }
    );
  }
}
