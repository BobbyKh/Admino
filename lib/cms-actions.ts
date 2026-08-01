"use server";

import { revalidatePath } from "next/cache";
import { eq, desc, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  galleryImages,
  homeSections,
  media,
  menuCategories,
  menuItems,
  navLinks,
  settings,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { SETTING_KEYS } from "@/lib/settings";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

export type AdminActionState = { success?: boolean; message?: string };

// ------------------------------------------------------------------ uploads

export type UploadState = { url?: string; error?: string };

/** Uploads an image file to Cloudinary and returns its secure URL. */
export async function uploadImage(formData: FormData): Promise<UploadState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose an image file." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Only image files are allowed." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const { secure_url } = await uploadImageToCloudinary(buffer, "maiti");
    return { url: secure_url };
  } catch (err) {
    console.error("Cloudinary upload failed:", err);
    return {
      error:
        "Upload failed. Add your Cloudinary credentials in Admin → Settings → Cloudinary (or set the CLOUDINARY_* env vars).",
    };
  }
}

// ------------------------------------------------------------------ settings

export async function updateSettings(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const now = new Date().toISOString();
  for (const key of SETTING_KEYS) {
    const value = formData.get(key);
    if (typeof value !== "string") continue;
    await db
      .insert(settings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } });
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { success: true, message: "Settings saved." };
}

// ------------------------------------------------------------------ gallery

export async function addGalleryImage(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const alt = String(formData.get("alt") ?? "").trim();
  const src = String(formData.get("src") ?? "").trim();
  const category = String(formData.get("category") ?? "All").trim() || "All";
  const featured = formData.get("featured") === "on";

  if (!title || !src) return { message: "Title and image URL are required." };

  await db.insert(galleryImages).values({
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

// ------------------------------------------------------------------ menu

export async function addMenuCategory(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
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

  await db.insert(menuCategories).values({ name, slug, description: description || null, sortOrder: 0 });
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
  const categoryId = Number(formData.get("categoryId"));
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const image = String(formData.get("image") ?? "").trim();
  const price = Number(formData.get("price"));
  const featured = formData.get("featured") === "on";

  if (!name || !categoryId || !price) return { message: "Name, category and price are required." };

  await db.insert(menuItems).values({
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

// ------------------------------------------------------------------ media

export type MediaUploadState = { url?: string; publicId?: string; width?: number; height?: number; error?: string };

/** Uploads a file (image or video) to Cloudinary and saves it to the media library. */
export async function uploadMedia(
  formData: FormData,
  folder?: string
): Promise<MediaUploadState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file." };
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    return { error: "Only image and video files are allowed." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadFolder = folder || "maiti/media";
  const resourceType = isVideo ? "video" : "image";

  try {
    const result = await uploadImageToCloudinary(buffer, uploadFolder, resourceType);

    // Save to media table
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    await db.insert(media).values({
      filename,
      originalName: file.name,
      url: result.secure_url,
      publicId: result.public_id,
      mimeType: file.type,
      size: file.size,
      width: result.width || null,
      height: result.height || null,
      folder: uploadFolder,
    });

    revalidatePath("/admin/media");
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    };
  } catch (err) {
    console.error("Cloudinary upload failed:", err);
    return {
      error:
        "Upload failed. Check your Cloudinary credentials in Admin → Settings.",
    };
  }
}

/** Get all media items, optionally filtered by folder and search query. */
export async function getMediaItems(options?: {
  folder?: string;
  search?: string;
  type?: "image" | "video";
  limit?: number;
  offset?: number;
}) {
  await requireAdmin();

  const query = db.select().from(media);

  // Apply filters in code since drizzle-orm sqlite doesn't support all operators easily
  const allItems = await query.orderBy(desc(media.createdAt));

  let filtered = allItems;

  if (options?.folder && options.folder !== "all") {
    filtered = filtered.filter((item) => item.folder === options.folder);
  }

  if (options?.type) {
    filtered = filtered.filter((item) =>
      options.type === "image" ? item.mimeType.startsWith("image/") : item.mimeType.startsWith("video/")
    );
  }

  if (options?.search) {
    const q = options.search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.originalName.toLowerCase().includes(q) ||
        (item.alt && item.alt.toLowerCase().includes(q)) ||
        item.filename.toLowerCase().includes(q)
    );
  }

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  return {
    items: filtered.slice(offset, offset + limit),
    total: filtered.length,
  };
}

/** Get unique folder names from the media library. */
export async function getMediaFolders() {
  await requireAdmin();

  const allItems = await db.select({ folder: media.folder }).from(media);
  const folders = [...new Set(allItems.map((item) => item.folder))].sort();
  return folders;
}

/** Delete a media item by ID. */
export async function deleteMediaItem(mediaId: number) {
  await requireAdmin();
  await db.delete(media).where(eq(media.id, mediaId));
  revalidatePath("/admin/media");
}

/** Update media alt text. */
export async function updateMediaAlt(mediaId: number, alt: string) {
  await requireAdmin();
  await db.update(media).set({ alt }).where(eq(media.id, mediaId));
  revalidatePath("/admin/media");
}

/** Update media folder (move to another folder). */
export async function moveMediaToFolder(mediaId: number, folder: string) {
  await requireAdmin();
  await db.update(media).set({ folder }).where(eq(media.id, mediaId));
  revalidatePath("/admin/media");
}

/** Create a new empty folder. */
export async function createMediaFolder(folderName: string) {
  await requireAdmin();
  // We just need to ensure the folder name is valid; actual folders don't exist on Cloudinary
  // The folder is just a metadata tag. We insert a placeholder if needed.
  const trimmed = folderName.trim().toLowerCase().replace(/[^a-z0-9/-]/g, "-");
  if (!trimmed) return { error: "Invalid folder name." };
  return { success: true, folder: trimmed };
}

// ------------------------------------------------------------------ nav links

export async function getNavLinks() {
  await requireAdmin();
  const allLinks = await db.select().from(navLinks).orderBy(asc(navLinks.sortOrder));
  return allLinks;
}

export async function addNavLink(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim();
  const external = formData.get("external") === "on";
  if (!label || !href) return { message: "Label and URL are required." };
  // Get max sortOrder
  const all = await db.select().from(navLinks).orderBy(desc(navLinks.sortOrder));
  const maxSort = all.length > 0 ? all[0].sortOrder + 1 : 0;
  await db.insert(navLinks).values({ label, href, sortOrder: maxSort, visible: true, external });
  revalidatePath("/", "layout");
  revalidatePath("/admin/navigation");
  return { success: true, message: "Link added." };
}

export async function updateNavLink(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const label = String(formData.get("label") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim();
  const visible = formData.get("visible") === "on";
  const external = formData.get("external") === "on";
  if (!id || !label || !href) return { message: "Label and URL are required." };
  await db.update(navLinks).set({ label, href, visible, external }).where(eq(navLinks.id, id));
  revalidatePath("/", "layout");
  revalidatePath("/admin/navigation");
  return { success: true, message: "Link updated." };
}

export async function deleteNavLink(id: number) {
  await requireAdmin();
  await db.delete(navLinks).where(eq(navLinks.id, id));
  revalidatePath("/", "layout");
  revalidatePath("/admin/navigation");
}

export async function reorderNavLinks(orderedIds: number[]) {
  await requireAdmin();
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(navLinks).set({ sortOrder: i }).where(eq(navLinks.id, orderedIds[i]));
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin/navigation");
}

// ------------------------------------------------------------------ home sections

export async function getHomeSections() {
  await requireAdmin();
  return db.select().from(homeSections).orderBy(asc(homeSections.sortOrder));
}

export async function addHomeSection(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const type = String(formData.get("type") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || null;
  if (!type) return { message: "Section type is required." };
  const all = await db.select().from(homeSections).orderBy(desc(homeSections.sortOrder));
  const maxSort = all.length > 0 ? all[0].sortOrder + 1 : 0;
  // Default config based on type
  let config: string | null = null;
  if (type === "banner") {
    config = JSON.stringify({ imageUrl: "", buttonText: "", buttonLink: "" });
  } else if (type === "customHtml") {
    config = JSON.stringify({ html: "" });
  }
  await db.insert(homeSections).values({ type, title, sortOrder: maxSort, visible: true, config });
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
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(homeSections).set({ sortOrder: i }).where(eq(homeSections.id, orderedIds[i]));
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin/homepage");
}
