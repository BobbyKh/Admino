"use server";

import { revalidatePath } from "next/cache";
import { eq, desc, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { homeSections } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getAdminSiteId } from "@/lib/admin-site";
import type { AdminActionState } from "./types";

export async function getHomeSections() {
  await requireAdmin();
  const siteId = await getAdminSiteId();
  return db.select().from(homeSections).where(eq(homeSections.siteId, siteId)).orderBy(asc(homeSections.sortOrder));
}

export async function addHomeSection(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const siteId = await getAdminSiteId();
  const type = String(formData.get("type") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || null;
  if (!type) return { message: "Section type is required." };
  const all = await db.select().from(homeSections).where(eq(homeSections.siteId, siteId)).orderBy(desc(homeSections.sortOrder));
  const maxSort = all.length > 0 ? all[0].sortOrder + 1 : 0;
  let config: string | null = null;
  if (type === "banner") {
    config = JSON.stringify({ imageUrl: "", buttonText: "", buttonLink: "" });
  } else if (type === "customHtml") {
    config = JSON.stringify({ html: "" });
  }
  await db.insert(homeSections).values({ siteId, type, title, sortOrder: maxSort, visible: true, config });
  revalidatePath("/", "layout");
  revalidatePath("/admin/homepage");
  return { success: true, message: "Section added." };
}

export async function updateHomeSection(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim() || null;
  const visible = formData.get("visible") === "on";
  const config = String(formData.get("config") ?? "").trim() || null;
  if (!id) return { message: "Section ID is required." };
  await db.update(homeSections).set({ title, visible, config }).where(eq(homeSections.id, id));
  revalidatePath("/", "layout");
  revalidatePath("/admin/homepage");
  return { success: true, message: "Section updated." };
}

export async function deleteHomeSection(id: number) {
  await requireAdmin();
  await db.delete(homeSections).where(eq(homeSections.id, id));
  revalidatePath("/", "layout");
  revalidatePath("/admin/homepage");
}

export async function reorderHomeSections(orderedIds: number[]) {
  await requireAdmin();
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(homeSections).set({ sortOrder: i }).where(eq(homeSections.id, orderedIds[i]));
    }
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/homepage");
}
