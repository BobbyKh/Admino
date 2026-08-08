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
