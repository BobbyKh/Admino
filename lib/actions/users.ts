"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { requireAdmin, hasMinRole } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { getAllAdminSites } from "@/lib/admin-site";
import type { AdminActionState } from "./types";

export async function getAdminUsers() {
  await requireAdmin();
  return db.select().from(adminUsers);
}

export async function getSitesForCurrentUser() {
  await requireAdmin();
  return getAllAdminSites();
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
  const siteIdRaw = formData.get("siteId");
  const siteId = siteIdRaw ? Number(siteIdRaw) : null;

  if (!name || !email || !password) {
    return { message: "Name, email, and password are required." };
  }
  if (password.length < 6) {
    return { message: "Password must be at least 6 characters." };
  }

  if (role === "super_admin" && userRole !== "super_admin") {
    return { message: "Only super admins can create super admin accounts." };
  }

  if (userRole !== "super_admin" && user.siteId) {
    if (siteId && siteId !== user.siteId) {
      return { message: "You can only assign users to your own site." };
    }
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
    siteId: siteId || null,
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
  const siteIdRaw = formData.get("siteId");
  const siteId = siteIdRaw ? Number(siteIdRaw) : null;

  if (!id || !name || !email) {
    return { message: "ID, name, and email are required." };
  }

  if (role === "super_admin" && userRole !== "super_admin") {
    return { message: "Only super admins can assign super admin role." };
  }

  if (id === currentUser.id && role !== currentUser.role) {
    return { message: "You cannot change your own role." };
  }

  if (userRole !== "super_admin" && currentUser.siteId) {
    if (siteId && siteId !== currentUser.siteId) {
      return { message: "You can only assign users to your own site." };
    }
  }

  const updateData: Record<string, unknown> = { name, email, role, siteId: siteId || null };

  if (newPassword) {
    if (newPassword.length < 6) {
      return { message: "Password must be at least 6 characters." };
    }
    updateData.passwordHash = await hashPassword(newPassword);
  }

  await db
    .update(adminUsers)
    .set(updateData)
    .where(eq(adminUsers.id, id));

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

  await db.delete(adminUsers).where(eq(adminUsers.id, id));
  revalidatePath("/admin/users");
}
