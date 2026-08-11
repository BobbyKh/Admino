"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { plans, subscriptions } from "@/lib/db/schema";
import { getActivePlans, getSiteSubscription, createOrReactivateSubscription, cancelSiteSubscription } from "@/lib/billing";
import { requireActionRole } from "@/lib/auth";
import { getCurrentAdminSiteId } from "@/lib/tenant-access";
import { createSubscriptionCheckout, createSubscriptionPortal, getBillingBaseUrl } from "@/lib/commerce/subscription-billing";

// ─── Public Actions ──────────────────────────────────────────────────────────

export async function getPlans() {
  return getActivePlans();
}

export async function getCurrentSubscription() {
  await requireActionRole("admin");
  return getSiteSubscription(await getCurrentAdminSiteId());
}

/**
 * Kicks off a Stripe subscription checkout for the admin's active site.
 * Returns the Checkout Session URL (or free-plan activation result).
 */
export async function subscribeToPlan(planSlug: string) {
  await requireActionRole("admin");
  const siteId = await getCurrentAdminSiteId();
  const result = await createSubscriptionCheckout(siteId, planSlug, getBillingBaseUrl());
  if ("error" in result) return { success: false, message: result.error };

  if (result.free) {
    revalidatePath("/admin/billing");
    revalidatePath("/admin/settings");
    return { success: true, message: "Free plan activated." };
  }

  if (!result.url) {
    return { success: false, message: "No checkout URL returned." };
  }

  return { success: true, url: result.url };
}

/** Opens the Stripe Billing Portal for the admin's active site. */
export async function manageSubscription() {
  await requireActionRole("admin");
  const siteId = await getCurrentAdminSiteId();
  const result = await createSubscriptionPortal(siteId, getBillingBaseUrl());
  if ("error" in result) return { success: false, message: result.error };

  return { success: true, url: result.url };
}

export async function selectPlan(planSlug: string) {
  await requireActionRole("admin");
  const siteId = await getCurrentAdminSiteId();

  const plan = await db
    .select()
    .from(plans)
    .where(and(eq(plans.slug, planSlug), eq(plans.active, true)))
    .limit(1);

  if (plan.length === 0) {
    return { success: false, message: "Plan not found." };
  }

  await createOrReactivateSubscription(siteId, plan[0].id);
  revalidatePath("/account");
  revalidatePath("/admin/settings");
  return { success: true, message: "Plan updated." };
}

export async function cancelSubscription() {
  await requireActionRole("admin");
  const siteId = await getCurrentAdminSiteId();

  await cancelSiteSubscription(siteId);
  revalidatePath("/account");
  revalidatePath("/admin/settings");
  return { success: true, message: "Subscription cancelled." };
}

// ─── Admin Actions ───────────────────────────────────────────────────────────

const planSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().int().min(0),
  currency: z.string().max(10).default("usd"),
  interval: z.enum(["month", "year"]).default("month"),
  features: z.string().optional(), // JSON array string
  maxPages: z.number().int().min(1).default(10),
  maxProducts: z.number().int().min(1).default(50),
  maxStorage: z.number().int().min(100).default(1000),
  maxBandwidth: z.number().int().min(1).default(10),
  stripePriceId: z.string().max(200).optional(),
  active: z.boolean().default(true),
});

export async function adminCreatePlan(_prev: unknown, formData: FormData) {
  await requireActionRole("super_admin");

  const featuresStr = formData.get("features") as string | null;
  let features: string[] = [];
  if (featuresStr) {
    try { features = JSON.parse(featuresStr); } catch { /* ignore */ }
  }

  const parsed = planSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    price: Number(formData.get("price")),
    currency: formData.get("currency") || undefined,
    interval: formData.get("interval") || undefined,
    features: featuresStr || undefined,
    maxPages: Number(formData.get("maxPages") || 10),
    maxProducts: Number(formData.get("maxProducts") || 50),
    maxStorage: Number(formData.get("maxStorage") || 1000),
    maxBandwidth: Number(formData.get("maxBandwidth") || 10),
    stripePriceId: formData.get("stripePriceId") || undefined,
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.insert(plans).values({
    ...parsed.data,
    features: JSON.stringify(features),
  });

  revalidatePath("/admin/billing");
  return { success: true, message: "Plan created." };
}

export async function adminDeletePlan(planId: number) {
  await requireActionRole("super_admin");

  const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
  if (!plan) return { success: false, message: "Plan not found." };

  // Check if any active subscriptions use this plan
  const activeSubs = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(and(eq(subscriptions.planId, planId), eq(subscriptions.status, "active")))
    .limit(1);

  if (activeSubs.length > 0) {
    return { success: false, message: "Cannot delete a plan with active subscriptions." };
  }

  await db.delete(plans).where(eq(plans.id, planId));
  revalidatePath("/admin/billing");
  return { success: true, message: "Plan deleted." };
}

export async function getAllSubscriptions() {
  await requireActionRole("super_admin");

  return db
    .select({
      id: subscriptions.id,
      siteId: subscriptions.siteId,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAt: subscriptions.cancelAt,
      plan: {
        name: plans.name,
        price: plans.price,
        currency: plans.currency,
        interval: plans.interval,
      },
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .orderBy(subscriptions.createdAt);
}
