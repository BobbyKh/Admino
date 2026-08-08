"use server";

import { and, eq, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversionFunnels, pageViews } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getCurrentAdminSiteId } from "@/lib/tenant-access";

// ─── Admin Actions ───────────────────────────────────────────────────────────

export async function getFunnels() {
  await requireAdmin();
  const siteId = await getCurrentAdminSiteId();

  return db
    .select()
    .from(conversionFunnels)
    .where(eq(conversionFunnels.siteId, siteId))
    .orderBy(desc(conversionFunnels.createdAt));
}

const funnelSchema = z.object({
  name: z.string().min(1).max(100),
  steps: z.string().min(2), // JSON array of path patterns
});

export async function createFunnel(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const siteId = await getCurrentAdminSiteId();

  let steps: string[];
  try {
    steps = JSON.parse(String(formData.get("steps") || "[]"));
    if (!Array.isArray(steps) || steps.length < 2) {
      return { success: false, message: "At least 2 steps are required." };
    }
  } catch {
    return { success: false, message: "Invalid steps format." };
  }

  const parsed = funnelSchema.safeParse({
    name: formData.get("name"),
    steps: String(formData.get("steps")),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  await db.insert(conversionFunnels).values({
    siteId,
    name: parsed.data.name,
    steps: JSON.stringify(steps),
  });

  revalidatePath("/admin/funnels");
  return { success: true, message: "Funnel created." };
}

export async function deleteFunnel(funnelId: number) {
  await requireAdmin();
  const siteId = await getCurrentAdminSiteId();

  await db
    .delete(conversionFunnels)
    .where(
      and(
        eq(conversionFunnels.id, funnelId),
        eq(conversionFunnels.siteId, siteId)
      )
    );

  revalidatePath("/admin/funnels");
  return { success: true, message: "Funnel deleted." };
}

export async function getFunnelResults(funnelId: number) {
  await requireAdmin();
  const siteId = await getCurrentAdminSiteId();

  const [funnel] = await db
    .select()
    .from(conversionFunnels)
    .where(
      and(
        eq(conversionFunnels.id, funnelId),
        eq(conversionFunnels.siteId, siteId)
      )
    )
    .limit(1);

  if (!funnel) return null;

  const steps = JSON.parse(funnel.steps) as string[];

  // For each step, count unique visitors who reached that path
  const stepResults = await Promise.all(
    steps.map(async (pattern, index) => {
      // Use LIKE for pattern matching (patterns are path prefixes/fragments)
      const [count] = await db
        .select({
          count: sql<number>`count(distinct ${pageViews.visitorId})::int`,
        })
        .from(pageViews)
        .where(
          and(
            eq(pageViews.siteId, siteId),
            sql`${pageViews.path} LIKE ${"%" + pattern + "%"}`
          )
        );

      return {
        step: index + 1,
        pattern,
        visitors: count?.count ?? 0,
      };
    })
  );

  // Calculate conversion rates relative to step 1
  const totalVisitors = stepResults[0]?.visitors ?? 0;
  const stepsWithRates = stepResults.map((step) => ({
    ...step,
    conversionRate:
      totalVisitors > 0
        ? Math.round((step.visitors / totalVisitors) * 10000) / 100
        : 0,
    dropoffRate:
      totalVisitors > 0
        ? Math.round(
            ((totalVisitors - step.visitors) / totalVisitors) * 10000
          ) / 100
        : 0,
  }));

  return { funnel, steps: stepsWithRates, totalVisitors };
}

// ─── Public Actions ──────────────────────────────────────────────────────────

/**
 * Track a funnel step visit. Called from storefront when a visitor reaches a path
 * that matches a funnel step pattern.
 *
 * Funnel analytics are computed from the pageViews table by matching path
 * patterns in getFunnelResults. No additional writes needed since pageViews
 * are already tracked via analytics-advanced.ts.
 */
export async function trackFunnelStep(): Promise<void> {}
