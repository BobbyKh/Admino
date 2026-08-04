"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { galleryImages } from "@/lib/db/schema";
import { getCurrentAdminSiteId } from "@/lib/tenant-access";
import type { AdminActionState } from "./types";

export async function addGalleryImage(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const siteId = await getCurrentAdminSiteId();
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
  const siteId = await getCurrentAdminSiteId();
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
    .where(and(eq(galleryImages.id, id), eq(galleryImages.siteId, siteId)));
  revalidatePath("/gallery");
  revalidatePath("/", "layout");
  revalidatePath("/admin/gallery");
  return { success: true, message: "Image updated." };
}

export async function deleteGalleryImage(imageId: number) {
  const siteId = await getCurrentAdminSiteId();
  await db.delete(galleryImages).where(and(eq(galleryImages.id, imageId), eq(galleryImages.siteId, siteId)));
  revalidatePath("/gallery");
  revalidatePath("/", "layout");
  revalidatePath("/admin/gallery");
}

export async function toggleFeatured(imageId: number, featured: boolean) {
  const siteId = await getCurrentAdminSiteId();
  await db
    .update(galleryImages)
    .set({ featured })
    .where(and(eq(galleryImages.id, imageId), eq(galleryImages.siteId, siteId)));
  revalidatePath("/gallery");
  revalidatePath("/", "layout");
  revalidatePath("/admin/gallery");
}
