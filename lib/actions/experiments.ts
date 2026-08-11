"use server";

import { and, eq, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  experiments,
  experimentAssignments,
  experimentEvents,
} from "@/lib/db/schema";
import { getResolvedSiteId } from "@/lib/site-context";
import { requireAdmin } from "@/lib/auth";
import { getCurrentAdminSiteId } from "@/lib/tenant-access";

// ─── Public Actions ──────────────────────────────────────────────────────────

/**
 * Get the active variant for a visitor and experiment.
 * Creates an assignment if none exists.
 */
export async function getVisitorVariant(
  experimentSlug: string,
  visitorId: string
): Promise<string | null> {
  const siteId = await getResolvedSiteId();
  if (!siteId) return null;

  const [experiment] = await db
    .select()
    .from(experiments)
    .where(
      and(
        eq(experiments.siteId, siteId),
        eq(experiments.slug, experimentSlug),
        eq(experiments.status, "running")
      )
    )
    .limit(1);

  if (!experiment) return null;

  // Check for existing assignment
  const [existing] = await db
    .select()
    .from(experimentAssignments)
    .where(
      and(
        eq(experimentAssignments.experimentId, experiment.id),
        eq(experimentAssignments.visitorId, visitorId)
      )
    )
    .limit(1);

  if (existing) return existing.variantId;

  // Check traffic allocation
  const trafficRoll = Math.random() * 100;
  if (trafficRoll > experiment.trafficPercent) return null;

  // Assign variant based on weights
  const variants = JSON.parse(experiment.variants ?? "[]") as Array<{
    id: string;
    name: string;
    weight: number;
  }>;

  if (variants.length === 0) return null;

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let roll = Math.random() * totalWeight;
  let selectedVariant = variants[0].id;

  for (const variant of variants) {
    roll -= variant.weight;
    if (roll <= 0) {
      selectedVariant = variant.id;
      break;
    }
  }

  // Create assignment
  await db.insert(experimentAssignments).values({
    experimentId: experiment.id,
    visitorId,
    variantId: selectedVariant,
  });

  // Track impression
  await db.insert(experimentEvents).values({
    experimentId: experiment.id,
    visitorId,
    variantId: selectedVariant,
    event: "impression",
  });

  return selectedVariant;
}

/**
 * Track a conversion event.
 */
export async function trackConversion(
  experimentSlug: string,
  visitorId: string,
  value?: number
): Promise<void> {
  const siteId = await getResolvedSiteId();
  if (!siteId) return;

  const [experiment] = await db
    .select()
    .from(experiments)
    .where(
      and(
        eq(experiments.siteId, siteId),
        eq(experiments.slug, experimentSlug)
      )
    )
    .limit(1);

  if (!experiment) return;

  // Get visitor's variant
  const [assignment] = await db
    .select()
    .from(experimentAssignments)
    .where(
      and(
        eq(experimentAssignments.experimentId, experiment.id),
        eq(experimentAssignments.visitorId, visitorId)
      )
    )
    .limit(1);

  if (!assignment) return;

  // Track conversion
  await db.insert(experimentEvents).values({
    experimentId: experiment.id,
    visitorId,
    variantId: assignment.variantId,
    event: "conversion",
    value,
  });
}

// ─── Admin Actions ───────────────────────────────────────────────────────────

export async function getExperiments() {
  await requireAdmin();
  const siteId = await getCurrentAdminSiteId();

  return db
    .select()
    .from(experiments)
    .where(eq(experiments.siteId, siteId))
    .orderBy(desc(experiments.createdAt));
}

const experimentSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  trafficPercent: z.number().int().min(0).max(100).default(50),
  variants: z.string().min(2), // JSON array string
});

export async function createExperiment(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const siteId = await getCurrentAdminSiteId();

  let variants: Array<{ id: string; name: string; weight: number }>;
  try {
    variants = JSON.parse(String(formData.get("variants") || "[]"));
    if (!Array.isArray(variants) || variants.length < 2) {
      return { success: false, message: "At least 2 variants are required." };
    }
  } catch {
    return { success: false, message: "Invalid variants format." };
  }

  const parsed = experimentSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    trafficPercent: Number(formData.get("trafficPercent") || 50),
    variants: String(formData.get("variants")),
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.insert(experiments).values({
    siteId,
    ...parsed.data,
    variants: JSON.stringify(variants),
  });

  revalidatePath("/admin/experiments");
  return { success: true, message: "Experiment created." };
}

export async function updateExperimentStatus(
  experimentId: number,
  status: "draft" | "running" | "paused" | "completed"
) {
  await requireAdmin();
  const siteId = await getCurrentAdminSiteId();

  await db
    .update(experiments)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(
      and(eq(experiments.id, experimentId), eq(experiments.siteId, siteId))
    );

  revalidatePath("/admin/experiments");
  return { success: true, message: `Experiment ${status}.` };
}

export async function deleteExperiment(experimentId: number) {
  await requireAdmin();
  const siteId = await getCurrentAdminSiteId();

  await db
    .delete(experiments)
    .where(
      and(eq(experiments.id, experimentId), eq(experiments.siteId, siteId))
    );

  revalidatePath("/admin/experiments");
  return { success: true, message: "Experiment deleted." };
}

export async function getExperimentResults(experimentId: number) {
  await requireAdmin();
  const siteId = await getCurrentAdminSiteId();

  const [experiment] = await db
    .select()
    .from(experiments)
    .where(
      and(eq(experiments.id, experimentId), eq(experiments.siteId, siteId))
    )
    .limit(1);

  if (!experiment) return null;

  const variants = JSON.parse(experiment.variants) as Array<{
    id: string;
    name: string;
    weight: number;
  }>;

  // Get stats per variant
  const results = await Promise.all(
    variants.map(async (variant) => {
      const [impressions] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(experimentEvents)
        .where(
          and(
            eq(experimentEvents.experimentId, experimentId),
            eq(experimentEvents.variantId, variant.id),
            eq(experimentEvents.event, "impression")
          )
        );

      const [conversions] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(experimentEvents)
        .where(
          and(
            eq(experimentEvents.experimentId, experimentId),
            eq(experimentEvents.variantId, variant.id),
            eq(experimentEvents.event, "conversion")
          )
        );

      const [totalValue] = await db
        .select({ sum: sql<number>`coalesce(sum(value), 0)::int` })
        .from(experimentEvents)
        .where(
          and(
            eq(experimentEvents.experimentId, experimentId),
            eq(experimentEvents.variantId, variant.id),
            eq(experimentEvents.event, "conversion")
          )
        );

      const impressionCount = impressions?.count ?? 0;
      const conversionCount = conversions?.count ?? 0;
      const conversionRate =
        impressionCount > 0 ? (conversionCount / impressionCount) * 100 : 0;

      return {
        variantId: variant.id,
        variantName: variant.name,
        impressions: impressionCount,
        conversions: conversionCount,
        conversionRate,
        totalValue: totalValue?.sum ?? 0,
      };
    })
  );

  return { experiment, results };
}
