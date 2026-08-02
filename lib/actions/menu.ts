"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { menuCategories, menuItems } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getAdminSiteId } from "@/lib/admin-site";
import type { AdminActionState } from "./types";

export async function addMenuCategory(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const siteId = await getAdminSiteId();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  let slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!slug) {
    slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }
  if (!slug) slug = `category-${Date.now()}`;

  if (!name) return { message: "Category name is required." };

  await db.insert(menuCategories).values({ siteId, name, slug, description: description || null, sortOrder: 0 });
  revalidatePath("/menu");
  revalidatePath("/", "layout");
  revalidatePath("/admin/menu");
  return { success: true, message: "Category added." };
}

export async function deleteMenuCategory(categoryId: number) {
  await requireAdmin();
  await db.delete(menuCategories).where(eq(menuCategories.id, categoryId));
  revalidatePath("/menu");
  revalidatePath("/admin/menu");
}

export async function addMenuItem(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const siteId = await getAdminSiteId();
  const categoryId = Number(formData.get("categoryId"));
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const image = String(formData.get("image") ?? "").trim();
  const price = Number(formData.get("price"));
  const featured = formData.get("featured") === "on";

  if (!name || !categoryId || !price) return { message: "Name, category and price are required." };

  await db.insert(menuItems).values({
    siteId,
    categoryId,
    name,
    description: description || null,
    image: image || null,
    price,
    featured,
    available: true,
    sortOrder: 0,
  });
  revalidatePath("/menu");
  revalidatePath("/", "layout");
  revalidatePath("/admin/menu");
  return { success: true, message: "Menu item added." };
}

export async function updateMenuItem(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const categoryId = Number(formData.get("categoryId"));
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const image = String(formData.get("image") ?? "").trim();
  const price = Number(formData.get("price"));
  const available = formData.get("available") === "on";
  const featured = formData.get("featured") === "on";

  if (!id || !name || !categoryId || !price) return { message: "Name, category and price are required." };

  await db
    .update(menuItems)
    .set({
      categoryId,
      name,
      description: description || null,
      image: image || null,
      price,
      available,
      featured,
    })
    .where(eq(menuItems.id, id));
  revalidatePath("/menu");
  revalidatePath("/", "layout");
  revalidatePath("/admin/menu");
  return { success: true, message: "Menu item updated." };
}

export async function deleteMenuItem(itemId: number) {
  await requireAdmin();
  await db.delete(menuItems).where(eq(menuItems.id, itemId));
  revalidatePath("/menu");
  revalidatePath("/", "layout");
  revalidatePath("/admin/menu");
}
