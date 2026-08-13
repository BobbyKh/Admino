import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings, userFeatures } from "@/lib/db/schema";
import type { Role } from "@/lib/auth";
import { DEFAULT_TENANT_FEATURES, TENANT_FEATURES, TENANT_FEATURE_METADATA, type TenantFeature } from "@/lib/tenant-features-constants";

export {
  TENANT_FEATURES,
  TENANT_FEATURE_METADATA,
  DEFAULT_TENANT_FEATURES,
  FEATURE_CATEGORIES,
  type TenantFeature,
  type FeatureCategory,
  type TenantFeatureMeta,
} from "@/lib/tenant-features-constants";

const FEATURE_SETTING_KEY = "tenant_feature_access";

function isTenantFeature(value: string): value is TenantFeature {
  return (TENANT_FEATURES as readonly string[]).includes(value);
}

export async function getTenantFeatureAccess(siteId: number): Promise<TenantFeature[]> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.siteId, siteId), eq(settings.key, FEATURE_SETTING_KEY)));
  if (!row?.value) return [...DEFAULT_TENANT_FEATURES];

  try {
    const value = JSON.parse(row.value);
    if (!Array.isArray(value)) return [...DEFAULT_TENANT_FEATURES];
    return value.filter((feature): feature is TenantFeature => isTenantFeature(feature));
  } catch {
    return [...DEFAULT_TENANT_FEATURES];
  }
}

export async function setTenantFeatureAccess(siteId: number, features: TenantFeature[]) {
  const value = JSON.stringify([...new Set(features)].filter(isTenantFeature));
  await db
    .insert(settings)
    .values({ siteId, key: FEATURE_SETTING_KEY, value, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: [settings.key, settings.siteId],
      set: { value, updatedAt: new Date().toISOString() },
    });
}

// ─── Per-user feature grants ─────────────────────────────────────────────────
// Restrictive overlay: once a user has explicit grants, they can only use the
// granted features. With no grants they inherit every feature enabled for their
// site. Super admins always retain access to everything.

export async function getUserFeatureAccess(userId: number): Promise<TenantFeature[]> {
  const rows = await db
    .select({ feature: userFeatures.feature })
    .from(userFeatures)
    .where(eq(userFeatures.userId, userId));
  return rows.map((row) => row.feature).filter(isTenantFeature);
}

export async function setUserFeatureAccess(userId: number, features: TenantFeature[]) {
  const unique = [...new Set(features)].filter(isTenantFeature);
  await db.transaction(async (tx) => {
    await tx.delete(userFeatures).where(eq(userFeatures.userId, userId));
    if (unique.length > 0) {
      await tx.insert(userFeatures).values(unique.map((feature) => ({ userId, feature })));
    }
  });
}

export async function deleteUserFeatureAccess(userId: number) {
  await db.delete(userFeatures).where(eq(userFeatures.userId, userId));
}

export async function getUsersFeatureAccess(userIds: number[]): Promise<Record<number, TenantFeature[]>> {
  if (userIds.length === 0) return {};
  const rows = await db
    .select({ userId: userFeatures.userId, feature: userFeatures.feature })
    .from(userFeatures)
    .where(inArray(userFeatures.userId, userIds));
  const result: Record<number, TenantFeature[]> = {};
  for (const row of rows) {
    if (!isTenantFeature(row.feature)) continue;
    (result[row.userId] ??= []).push(row.feature);
  }
  return result;
}

// ─── Access evaluation ───────────────────────────────────────────────────────

export interface TenantAccessContext {
  role: Role;
  userId?: number;
}

export function tenantFeatureDeniedMessage(feature: TenantFeature): string {
  const label = TENANT_FEATURE_METADATA[feature]?.label ?? feature;
  return `The "${label}" feature is not enabled for this tenant. Ask a super admin to grant access.`;
}

/**
 * Whether a user can use a feature for a site:
 * - super admins always have access;
 * - the feature must be enabled for the site;
 * - if the user has explicit per-user grants, the feature must be among them
 *   (otherwise the user inherits every site-enabled feature).
 */
export async function hasTenantFeatureAccess(
  siteId: number,
  feature: TenantFeature,
  ctx: TenantAccessContext
): Promise<boolean> {
  const features = await getTenantFeatureAccess(siteId);
  if (ctx.role === "super_admin") return feature === "marketplace" ? features.includes(feature) : true;
  if (!features.includes(feature)) return false;
  if (ctx.userId == null) return true;
  const userAccess = await getUserFeatureAccess(ctx.userId);
  if (userAccess.length === 0) return true;
  return userAccess.includes(feature);
}

/** Returns the denied message or null when the current context has access. */
export async function checkTenantFeature(
  siteId: number,
  feature: TenantFeature,
  ctx: TenantAccessContext
): Promise<string | null> {
  const allowed = await hasTenantFeatureAccess(siteId, feature, ctx);
  return allowed ? null : tenantFeatureDeniedMessage(feature);
}

/** Throws when the context lacks access to the feature. */
export async function requireTenantFeature(siteId: number, feature: TenantFeature, ctx: TenantAccessContext) {
  const denied = await checkTenantFeature(siteId, feature, ctx);
  if (denied) throw new Error(denied);
}

/** Features this user can actually use for a site (for nav/menu gating). */
export async function getEffectiveTenantFeatureAccess(
  siteId: number,
  ctx: TenantAccessContext
): Promise<TenantFeature[]> {
  if (ctx.role === "super_admin") {
    const siteFeatures = await getTenantFeatureAccess(siteId);
    return TENANT_FEATURES.filter((feature) => feature !== "marketplace" || siteFeatures.includes(feature));
  }
  const siteFeatures = await getTenantFeatureAccess(siteId);
  if (ctx.userId == null) return siteFeatures;
  const userAccess = await getUserFeatureAccess(ctx.userId);
  if (userAccess.length === 0) return siteFeatures;
  return siteFeatures.filter((feature) => userAccess.includes(feature));
}
