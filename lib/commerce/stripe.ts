import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { decryptCommerceSecrets } from "./secrets";

let stripeInstance: Stripe | null = null;

function getStripeSecretKey(): string | null {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY;
  return null;
}

export async function getStripeForSite(siteId: number): Promise<Stripe | null> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.siteId, siteId), eq(settings.key, "commerce_payment_stripe_secrets")));

  if (!row?.value) return null;

  const secrets = decryptCommerceSecrets(row.value);
  const secretKey = secrets.secretKey as string | undefined;
  if (!secretKey) return null;

  if (stripeInstance && secretKey === getStripeSecretKey()) {
    return stripeInstance;
  }

  return new Stripe(secretKey);
}

export async function getStripeSecretKeyForSite(siteId: number): Promise<string | null> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.siteId, siteId), eq(settings.key, "commerce_payment_stripe_secrets")));

  if (!row?.value) return null;
  const secrets = decryptCommerceSecrets(row.value);
  return (secrets.secretKey as string) ?? null;
}

/**
 * Platform-level Stripe client for Admino's own SaaS subscription billing.
 * Uses the STRIPE_SECRET_KEY environment variable (the platform account),
 * NOT the tenant's per-store keys.
 */
export async function getPlatformStripe(): Promise<Stripe | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (stripeInstance && key === getStripeSecretKey()) return stripeInstance;
  return new Stripe(key);
}

/**
 * Resolves the Stripe Price ID for a plan. Uses the plan's stored
 * `stripePriceId` if present; otherwise creates a one-time Stripe price
 * (in the platform account) from the plan's price/interval and returns it.
 */
export async function resolvePlatformPriceId(plan: {
  name: string;
  slug: string;
  price: number;
  currency: string;
  interval: string;
  stripePriceId: string | null;
}): Promise<string | null> {
  if (plan.stripePriceId) return plan.stripePriceId;
  const stripe = await getPlatformStripe();
  if (!stripe) return null;

  const price = await stripe.prices.create({
    currency: plan.currency || "usd",
    unit_amount: plan.price,
    product_data: { name: plan.name, metadata: { planSlug: plan.slug } },
    recurring: { interval: plan.interval === "year" ? "year" : "month" },
  });
  return price.id;
}
