"use server";

import { revalidatePath } from "next/cache";
import { and, eq, desc, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { homeSections } from "@/lib/db/schema";
import { getCurrentSiteRequiringFeature, getCurrentSiteRequiringFeatureForRole, getCurrentSiteWithFeatureForRole } from "@/lib/tenant-access";
import type { AdminActionState } from "./types";

export async function getHomeSections() {
  const siteId = await getCurrentSiteRequiringFeature("pages");
  return db.select().from(homeSections).where(eq(homeSections.siteId, siteId)).orderBy(asc(homeSections.sortOrder));
}

export async function addHomeSection(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const { siteId, denied } = await getCurrentSiteWithFeatureForRole("pages", "editor");
  if (denied) return { message: denied };
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
  const { siteId, denied } = await getCurrentSiteWithFeatureForRole("pages", "editor");
  if (denied) return { message: denied };
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim() || null;
  const visible = formData.get("visible") === "on";
  const config = String(formData.get("config") ?? "").trim() || null;
  if (!id) return { message: "Section ID is required." };
  await db.update(homeSections).set({ title, visible, config }).where(and(eq(homeSections.id, id), eq(homeSections.siteId, siteId)));
  revalidatePath("/", "layout");
  revalidatePath("/admin/homepage");
  return { success: true, message: "Section updated." };
}

export async function deleteHomeSection(id: number) {
  const siteId = await getCurrentSiteRequiringFeatureForRole("pages", "editor");
  await db.delete(homeSections).where(and(eq(homeSections.id, id), eq(homeSections.siteId, siteId)));
  revalidatePath("/", "layout");
  revalidatePath("/admin/homepage");
}

export async function reorderHomeSections(orderedIds: number[]) {
  const siteId = await getCurrentSiteRequiringFeatureForRole("pages", "editor");
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(homeSections).set({ sortOrder: i }).where(and(eq(homeSections.id, orderedIds[i]), eq(homeSections.siteId, siteId)));
    }
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/homepage");
}
