"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminUsers, sites } from "@/lib/db/schema";
import { requireAdmin, hasMinRole, type Role } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { getAdminSiteId, getAllAdminSites } from "@/lib/admin-site";
import { getUserFeatureAccess, setUserFeatureAccess, type TenantFeature } from "@/lib/tenant-features";
import type { AdminActionState } from "./types";

export async function getAdminUsers() {
  await requireAdmin();
  const siteId = await getAdminSiteId();
  return db
    .select()
    .from(adminUsers)
    .where(and(eq(adminUsers.siteId, siteId), ne(adminUsers.role, "super_admin")));
}

export async function getSitesForCurrentUser() {
  await requireAdmin();
  return getAllAdminSites();
}

export async function getCurrentUserRole() {
  const user = await requireAdmin();
  return (user.role as string) ?? "viewer";
}

export async function createAdminUser(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const user = await requireAdmin();
  const userRole = (user.role as string) ?? "viewer";
  if (!hasMinRole(userRole as "admin" | "super_admin" | "editor" | "viewer", "admin")) {
    return { message: "You don't have permission to create users." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const role = String(formData.get("role") ?? "viewer").trim();
  const formSiteId = Number(formData.get("siteId"));

  if (!name || !email || !password) {
    return { message: "Name, email, and password are required." };
  }
  if (password.length < 6) {
    return { message: "Password must be at least 6 characters." };
  }

  if (!['admin', 'editor', 'viewer'].includes(role)) {
    return { message: "Tenant users must be an admin, editor, or viewer." };
  }

  let siteId: number;
  if (userRole === "super_admin" && formSiteId > 0) {
    const [targetSite] = await db.select({ id: sites.id }).from(sites).where(eq(sites.id, formSiteId));
    if (!targetSite) {
      return { message: "Invalid site selected." };
    }
    siteId = targetSite.id;
  } else {
    siteId = await getAdminSiteId();
  }

  const [existing] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email));
  if (existing) {
    return { message: "A user with this email already exists." };
  }

  await db.insert(adminUsers).values({
    name,
    email,
    passwordHash: await hashPassword(password),
    role,
    siteId,
  });

  revalidatePath("/admin/users");
  return { success: true, message: "User created." };
}

export async function updateAdminUser(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const currentUser = await requireAdmin();
  const userRole = (currentUser.role as string) ?? "viewer";
  if (!hasMinRole(userRole as "admin" | "super_admin" | "editor" | "viewer", "admin")) {
    return { message: "You don't have permission to edit users." };
  }

  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "viewer").trim();
  const newPassword = String(formData.get("password") ?? "").trim();
  const formSiteId = Number(formData.get("siteId"));

  if (!id || !name || !email) {
    return { message: "ID, name, and email are required." };
  }

  if (!['admin', 'editor', 'viewer'].includes(role)) {
    return { message: "Tenant users must be an admin, editor, or viewer." };
  }

  if (id === currentUser.id && role !== currentUser.role) {
    return { message: "You cannot change your own role." };
  }

  let siteId: number;
  if (userRole === "super_admin" && formSiteId > 0) {
    const [targetSite] = await db.select({ id: sites.id }).from(sites).where(eq(sites.id, formSiteId));
    if (!targetSite) {
      return { message: "Invalid site selected." };
    }
    siteId = targetSite.id;
  } else {
    siteId = await getAdminSiteId();
  }

  const [targetUser] = await db
    .select({ siteId: adminUsers.siteId, role: adminUsers.role })
    .from(adminUsers)
    .where(eq(adminUsers.id, id));
  if (!targetUser || targetUser.siteId !== siteId || targetUser.role === "super_admin") {
    return { message: "You can only edit users assigned to the active site." };
  }

  const updateData: Record<string, unknown> = { name, email, role, siteId };

  if (newPassword) {
    if (newPassword.length < 6) {
      return { message: "Password must be at least 6 characters." };
    }
    updateData.passwordHash = await hashPassword(newPassword);
  }

  await db
    .update(adminUsers)
    .set(updateData)
    .where(
      and(eq(adminUsers.id, id), eq(adminUsers.siteId, siteId), ne(adminUsers.role, "super_admin"))
    );

  revalidatePath("/admin/users");
  return { success: true, message: "User updated." };
}

export async function deleteAdminUser(id: number) {
  const currentUser = await requireAdmin();
  const userRole = (currentUser.role as string) ?? "viewer";
  if (!hasMinRole(userRole as "admin" | "super_admin" | "editor" | "viewer", "admin")) {
    return { message: "You don't have permission to delete users." };
  }

  if (id === currentUser.id) {
    return { message: "You cannot delete your own account." };
  }

  const siteId = await getAdminSiteId();
  const [targetUser] = await db
    .select({ siteId: adminUsers.siteId, role: adminUsers.role })
    .from(adminUsers)
    .where(eq(adminUsers.id, id));
  if (!targetUser || targetUser.siteId !== siteId || targetUser.role === "super_admin") {
    return { message: "You can only delete users assigned to the active site." };
  }

  await db
    .delete(adminUsers)
    .where(
      and(eq(adminUsers.id, id), eq(adminUsers.siteId, siteId), ne(adminUsers.role, "super_admin"))
    );
  revalidatePath("/admin/users");
}

/** Resolves a target tenant user, enforcing admin+ access and site scope. */
async function resolveManageableTargetUser(userId: number) {
  const currentUser = await requireAdmin();
  const userRole = (currentUser.role as Role) ?? "viewer";
  if (!hasMinRole(userRole, "admin")) return null;
  const siteId = await getAdminSiteId();
  const [target] = await db
    .select({ siteId: adminUsers.siteId, role: adminUsers.role })
    .from(adminUsers)
    .where(eq(adminUsers.id, userId));
  if (!target || target.role === "super_admin") return null;
  if (userRole !== "super_admin" && target.siteId !== siteId) return null;
  return { siteId };
}

/** Per-user tenant feature grants for a manageable tenant user. */
export async function getUserFeatures(userId: number): Promise<TenantFeature[]> {
  const target = await resolveManageableTargetUser(userId);
  if (!target) return [];
  return getUserFeatureAccess(userId);
}

/** Overwrites a tenant user's per-user feature grants (empty = inherit site). */
export async function updateUserFeatures(
  userId: number,
  features: TenantFeature[]
): Promise<AdminActionState> {
  const target = await resolveManageableTargetUser(userId);
  if (!target) {
    return { message: "You can only manage access for tenant users on the active site." };
  }
  await setUserFeatureAccess(userId, features);
  revalidatePath("/admin/users");
  return { success: true, message: "Feature access updated." };
}
