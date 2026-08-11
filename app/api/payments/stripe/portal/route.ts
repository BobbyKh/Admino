import { NextRequest, NextResponse } from "next/server";
import { requireActionRole } from "@/lib/auth";
import { getAdminSiteId } from "@/lib/admin-site";
import { createSubscriptionPortal, getBillingBaseUrl } from "@/lib/commerce/subscription-billing";

/**
 * Creates a Stripe Billing Portal session so a site owner can manage their
 * subscription (upgrade, downgrade, cancel, update payment method).
 *
 */
export async function POST(request: NextRequest) {
  try {
    await requireActionRole("admin");
    const siteId = await getAdminSiteId();
    const result = await createSubscriptionPortal(siteId, getBillingBaseUrl(request.nextUrl.origin));
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("[Stripe Billing Portal]", error);
    return NextResponse.json({ error: "Failed to open billing portal." }, { status: 500 });
  }
}
