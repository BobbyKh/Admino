import "server-only";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pageBlocks, pages } from "@/lib/db/schema";
import { hasMinRole, requireAdmin, type Role } from "@/lib/auth";
import { getAdminSiteId } from "@/lib/admin-site";
import {
  checkTenantFeature,
  requireTenantFeature,
  type TenantFeature,
} from "@/lib/tenant-features";

/** Returns the site currently authorized for the authenticated admin. */
export async function getCurrentAdminSiteId(): Promise<number> {
  await requireAdmin();
  return getAdminSiteId();
}

/** Currently authenticated admin plus their active site selection. */
export async function getCurrentAdminContext() {
  const user = await requireAdmin();
  const siteId = await getAdminSiteId();
  return { siteId, user };
}

/**
 * Site id + denial message for the active admin context. Callers that return a
 * friendly AdminActionState message should inspect `denied` and bail out.
 */
export async function getCurrentSiteWithFeature(feature: TenantFeature) {
  const { siteId, user } = await getCurrentAdminContext();
  const denied = await checkTenantFeature(siteId, feature, {
    role: user.role as Role,
    userId: user.id,
  });
  return { siteId, denied };
}

/** Active tenant context with a minimum backend role for mutation actions. */
export async function getCurrentSiteWithFeatureForRole(feature: TenantFeature, minRole: Role) {
  const { siteId, user } = await getCurrentAdminContext();
  const role = (user.role as Role) ?? "viewer";
  if (!hasMinRole(role, minRole)) return { siteId, denied: "You do not have permission to perform this action.", user };
  const denied = await checkTenantFeature(siteId, feature, { role, userId: user.id });
  return { siteId, denied, user };
}

/** Throws unless the active admin context may use the feature. */
export async function getCurrentSiteRequiringFeature(feature: TenantFeature): Promise<number> {
  const { siteId, user } = await getCurrentAdminContext();
  await requireTenantFeature(siteId, feature, { role: user.role as Role, userId: user.id });
  return siteId;
}

/** Throws unless the active tenant has the feature and the user has the required role. */
export async function getCurrentSiteRequiringFeatureForRole(feature: TenantFeature, minRole: Role): Promise<number> {
  const { siteId, denied } = await getCurrentSiteWithFeatureForRole(feature, minRole);
  if (denied) throw new Error(denied);
  return siteId;
}

/**
 * Page-level guard for server components. Redirects to /admin when the active
 * admin is not allowed to use the feature for the given site.
 */
export async function assertTenantFeaturePage(siteId: number, feature: TenantFeature) {
  const user = await requireAdmin();
  const denied = await checkTenantFeature(siteId, feature, {
    role: user.role as Role,
    userId: user.id,
  });
  if (denied) redirect("/admin");
}

/** Verifies access to a site supplied by an untrusted client request. */
export async function requireSiteAccess(siteId: number) {
  const user = await requireAdmin();
  if ((user.role as Role) !== "super_admin" && user.siteId !== siteId) {
    throw new Error("Forbidden");
  }
  return user;
}

/** Verifies an explicitly selected site, feature, and role for stale-tab-safe actions. */
export async function requireSiteFeatureForRole(siteId: number, feature: TenantFeature, minRole: Role) {
  const user = await requireSiteAccess(siteId);
  const role = (user.role as Role) ?? "viewer";
  if (!hasMinRole(role, minRole)) throw new Error("Forbidden");
  await requireTenantFeature(siteId, feature, { role, userId: user.id });
  return user;
}

export async function requirePageAccess(pageId: number) {
  const [page] = await db.select().from(pages).where(eq(pages.id, pageId));
  if (!page) throw new Error("Page not found");
  await requireSiteAccess(page.siteId);
  return page;
}

export async function requirePageBlockAccess(blockId: number) {
  const [block] = await db.select().from(pageBlocks).where(eq(pageBlocks.id, blockId));
  if (!block) throw new Error("Block not found");
  await requirePageAccess(block.pageId);
  return block;
}
