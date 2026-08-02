"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import type { AdminActionState } from "./types";

export async function createSite(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  let slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!slug) slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!slug) slug = `site-${Date.now()}`;
  const template = String(formData.get("template") ?? "blank").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) return { message: "Site name is required." };

  await db.insert(sites).values({
    name,
    slug,
    template,
    description,
    published: false,
  });
  revalidatePath("/admin/sites");
  return { success: true, message: "Site created." };
}

export async function updateSite(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const published = formData.get("published") === "on";

  if (!id || !name) return { message: "Site ID and name are required." };

  await db
    .update(sites)
    .set({ name, description, published, updatedAt: new Date().toISOString() })
    .where(eq(sites.id, id));
  revalidatePath("/admin/sites");
  return { success: true, message: "Site updated." };
}

export async function deleteSite(id: number) {
  await requireAdmin();
  await db.delete(sites).where(eq(sites.id, id));
  revalidatePath("/admin/sites");
}

export async function getSites() {
  await requireAdmin();
  return db.select().from(sites);
}
