import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import type { Role } from "@/lib/auth";

export const TENANT_FEATURES = ["ai_theme_generator", "ai_block_assistant"] as const;
export type TenantFeature = (typeof TENANT_FEATURES)[number];

const FEATURE_SETTING_KEY = "tenant_feature_access";

export async function getTenantFeatureAccess(siteId: number): Promise<TenantFeature[]> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.siteId, siteId), eq(settings.key, FEATURE_SETTING_KEY)));
  if (!row?.value) return [];

  try {
    const value = JSON.parse(row.value);
    if (!Array.isArray(value)) return [];
    return value.filter((feature): feature is TenantFeature => TENANT_FEATURES.includes(feature));
  } catch {
    return [];
  }
}

export async function setTenantFeatureAccess(siteId: number, features: TenantFeature[]) {
  const value = JSON.stringify([...new Set(features)]);
  await db
    .insert(settings)
    .values({ siteId, key: FEATURE_SETTING_KEY, value, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: [settings.key, settings.siteId],
      set: { value, updatedAt: new Date().toISOString() },
    });
}

export async function requireTenantFeature(siteId: number, feature: TenantFeature, role: Role) {
  if (role === "super_admin") return;
  const features = await getTenantFeatureAccess(siteId);
  if (!features.includes(feature)) {
    throw new Error("This AI feature is not enabled for this tenant. Ask a super admin to grant access.");
  }
}
