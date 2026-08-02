"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { galleryImages } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getAdminSiteId } from "@/lib/admin-site";
import type { AdminActionState } from "./types";

export async function addGalleryImage(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const siteId = await getAdminSiteId();
  const title = String(formData.get("title") ?? "").trim();
  const alt = String(formData.get("alt") ?? "").trim();
  const src = String(formData.get("src") ?? "").trim();
  const category = String(formData.get("category") ?? "All").trim() || "All";
  const featured = formData.get("featured") === "on";

  if (!title || !src) return { message: "Title and image URL are required." };

  await db.insert(galleryImages).values({
    siteId,
    title,
    alt: alt || title,
    src,
    category,
    featured,
    sortOrder: 0,
  });
  revalidatePath("/gallery");
  revalidatePath("/", "layout");
  revalidatePath("/admin/gallery");
  return { success: true, message: "Image added to gallery." };
}

export async function updateGalleryImage(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const alt = String(formData.get("alt") ?? "").trim();
  const src = String(formData.get("src") ?? "").trim();
  const category = String(formData.get("category") ?? "All").trim() || "All";
  const featured = formData.get("featured") === "on";

  if (!title || !src || !id) return { message: "Title and image URL are required." };

  await db
    .update(galleryImages)
    .set({ title, alt: alt || title, src, category, featured })
    .where(eq(galleryImages.id, id));
  revalidatePath("/gallery");
  revalidatePath("/", "layout");
  revalidatePath("/admin/gallery");
  return { success: true, message: "Image updated." };
}

export async function deleteGalleryImage(imageId: number) {
  await requireAdmin();
  await db.delete(galleryImages).where(eq(galleryImages.id, imageId));
  revalidatePath("/gallery");
  revalidatePath("/", "layout");
  revalidatePath("/admin/gallery");
}

export async function toggleFeatured(imageId: number, featured: boolean) {
  await requireAdmin();
  await db
    .update(galleryImages)
    .set({ featured })
    .where(eq(galleryImages.id, imageId));
  revalidatePath("/gallery");
  revalidatePath("/", "layout");
  revalidatePath("/admin/gallery");
}
