import { NextRequest, NextResponse } from "next/server";
import { requireActionRole } from "@/lib/auth";
import { getAdminSiteId } from "@/lib/admin-site";
import { createSubscriptionCheckout, getBillingBaseUrl } from "@/lib/commerce/subscription-billing";

/**
 * Creates a Stripe Checkout Session (mode: subscription) for the given
 * site + plan. This powers Admino's own SaaS plan checkout.
 *
 * Body: { planSlug: string }
 */
export async function POST(request: NextRequest) {
  try {
    await requireActionRole("admin");
    const siteId = await getAdminSiteId();
    const { planSlug } = await request.json() as { planSlug: string };
    if (!planSlug) {
      return NextResponse.json({ error: "Plan slug is required." }, { status: 400 });
    }

    const result = await createSubscriptionCheckout(siteId, planSlug, getBillingBaseUrl(request.nextUrl.origin));
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("[Stripe Subscription Checkout]", error);
    return NextResponse.json(
      { error: "Failed to create subscription checkout." },
      { status: 500 }
    );
  }
}
