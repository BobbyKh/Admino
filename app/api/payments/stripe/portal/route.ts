import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { getPlatformStripe } from "@/lib/commerce/stripe";
import { getSiteForRequest } from "@/lib/site-context";

/**
 * Creates a Stripe Billing Portal session so a site owner can manage their
 * subscription (upgrade, downgrade, cancel, update payment method).
 *
 * Body: { siteUrl?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { siteUrl } = await request.json() as { siteUrl?: string };

    const host = request.headers.get("x-request-host") ?? request.headers.get("host") ?? "localhost";
    const siteSlug = request.nextUrl.searchParams.get("site");
    const site = await getSiteForRequest(host, siteSlug);
    if (!site) {
      return NextResponse.json({ error: "Site not found." }, { status: 404 });
    }

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.siteId, site.id))
      .limit(1);

    const stripe = await getPlatformStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured." }, { status: 400 });
    }

    let customerId = sub?.stripeCustomerId ?? undefined;

    // No Stripe subscription yet — nothing to manage.
    if (!customerId && !sub?.stripeSubscriptionId) {
      return NextResponse.json({ error: "No subscription to manage." }, { status: 400 });
    }

    // If we have a subscription but no customer record, pull it from Stripe.
    if (!customerId && sub?.stripeSubscriptionId) {
      const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
      if (stripeSub.customer) customerId = String(stripeSub.customer);
    }

    if (!customerId) {
      return NextResponse.json({ error: "No Stripe customer for this site." }, { status: 400 });
    }

    const baseUrl = siteUrl ?? `${request.headers.get("x-forwarded-proto") ?? "https"}://${host}`;
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/admin/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[Stripe Billing Portal]", error);
    return NextResponse.json({ error: "Failed to open billing portal." }, { status: 500 });
  }
}
