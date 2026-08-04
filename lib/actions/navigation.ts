"use server";

import { revalidatePath } from "next/cache";
import { and, eq, desc, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { navLinks } from "@/lib/db/schema";
import { getCurrentAdminSiteId } from "@/lib/tenant-access";
import type { AdminActionState } from "./types";

export async function getNavLinks() {
  const siteId = await getCurrentAdminSiteId();
  return db.select().from(navLinks).where(eq(navLinks.siteId, siteId)).orderBy(asc(navLinks.sortOrder));
}

export async function addNavLink(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const siteId = await getCurrentAdminSiteId();
  const label = String(formData.get("label") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim();
  const external = formData.get("external") === "on";
  if (!label || !href) return { message: "Label and URL are required." };
  const all = await db.select().from(navLinks).where(eq(navLinks.siteId, siteId)).orderBy(desc(navLinks.sortOrder));
  const maxSort = all.length > 0 ? all[0].sortOrder + 1 : 0;
  await db.insert(navLinks).values({ siteId, label, href, sortOrder: maxSort, visible: true, external });
  revalidatePath("/", "layout");
  revalidatePath("/admin/navigation");
  return { success: true, message: "Link added." };
}

export async function updateNavLink(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const siteId = await getCurrentAdminSiteId();
  const id = Number(formData.get("id"));
  const label = String(formData.get("label") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim();
  const visible = formData.get("visible") === "on";
  const external = formData.get("external") === "on";
  if (!id || !label || !href) return { message: "Label and URL are required." };
  await db.update(navLinks).set({ label, href, visible, external }).where(and(eq(navLinks.id, id), eq(navLinks.siteId, siteId)));
  revalidatePath("/", "layout");
  revalidatePath("/admin/navigation");
  return { success: true, message: "Link updated." };
}

export async function deleteNavLink(id: number) {
  const siteId = await getCurrentAdminSiteId();
  await db.delete(navLinks).where(and(eq(navLinks.id, id), eq(navLinks.siteId, siteId)));
  revalidatePath("/", "layout");
  revalidatePath("/admin/navigation");
}

export async function reorderNavLinks(orderedIds: number[]) {
  const siteId = await getCurrentAdminSiteId();
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(navLinks).set({ sortOrder: i }).where(and(eq(navLinks.id, orderedIds[i]), eq(navLinks.siteId, siteId)));
    }
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/navigation");
}
