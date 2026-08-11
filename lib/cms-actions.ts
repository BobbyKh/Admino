"use server";

import { revalidatePath } from "next/cache";
import { eq, desc, asc, and, ilike, ne, sql } from "drizzle-orm";
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
import { uploadImageToCloudinary, getCloudinaryConfig } from "@/lib/cloudinary";
import { v2 as cloudinary } from "cloudinary";
import { getAdminSiteId } from "@/lib/admin-site";
import { logActivity, type ActivityEntity, type ActivityAction } from "@/lib/activity";
import { sendActivityNotification } from "@/lib/email";
import { getSessionUser, type Role } from "@/lib/auth";

export type AdminActionState = { success?: boolean; message?: string };

/**
 * Helper: log activity + send email notification to super admins and tenant admins.
 */
async function trackActivity(
  action: ActivityAction,
  entity: ActivityEntity,
  opts: {
    siteId?: number | null;
    siteName?: string | null;
    entityId?: number | null;
    entityName?: string | null;
    details?: Record<string, unknown> | null;
  } = {}
) {
  const user = await getSessionUser();
  const userName = user?.name ?? "Unknown";
  const userRole = (user?.role as Role) ?? "unknown";

  await logActivity({ action, entity, ...opts });
  await sendActivityNotification({
    action,
    entity,
    siteId: opts.siteId ?? null,
    siteName: opts.siteName ?? null,
    entityId: opts.entityId ?? null,
    entityName: opts.entityName ?? null,
    details: opts.details ?? null,
    userName,
    userRole,
  });
}

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
    const { secure_url } = await uploadImageToCloudinary(buffer, "admino");
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
  const siteId = await getAdminSiteId();
  const now = new Date().toISOString();
  for (const key of SETTING_KEYS) {
    const value = formData.get(key);
    if (typeof value !== "string") continue;
    await db
      .insert(settings)
      .values({ key, siteId, value, updatedAt: now })
      .onConflictDoUpdate({
        target: [settings.key, settings.siteId],
        set: { value, updatedAt: now },
      });
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  await trackActivity("update", "settings", { siteId, entityName: "Site Settings" });
  return { success: true, message: "Settings saved." };
}

// ------------------------------------------------------------------ gallery

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
  await trackActivity("create", "gallery", { siteId, entityName: title });
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
  await trackActivity("update", "gallery", { siteId: null, entityId: id, entityName: title });
  return { success: true, message: "Image updated." };
}

export async function deleteGalleryImage(imageId: number) {
  await requireAdmin();
  await db.delete(galleryImages).where(eq(galleryImages.id, imageId));
  revalidatePath("/gallery");
  revalidatePath("/", "layout");
  revalidatePath("/admin/gallery");
  await trackActivity("delete", "gallery", { entityId: imageId });
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
  await trackActivity("create", "menu_category", { siteId, entityName: name });
  return { success: true, message: "Category added." };
}

export async function deleteMenuCategory(categoryId: number) {
  await requireAdmin();
  await db.delete(menuCategories).where(eq(menuCategories.id, categoryId));
  revalidatePath("/menu");
  revalidatePath("/admin/menu");
  await trackActivity("delete", "menu_category", { entityId: categoryId });
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
  await trackActivity("create", "menu_item", { siteId, entityName: name });
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
  await trackActivity("update", "menu_item", { entityId: id, entityName: name });
  return { success: true, message: "Menu item updated." };
}

export async function deleteMenuItem(itemId: number) {
  await requireAdmin();
  await db.delete(menuItems).where(eq(menuItems.id, itemId));
  revalidatePath("/menu");
  revalidatePath("/", "layout");
  revalidatePath("/admin/menu");
  await trackActivity("delete", "menu_item", { entityId: itemId });
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
    const uploadFolder = folder || "admino/media";
  const resourceType = isVideo ? "video" : "image";

  try {
    const result = await uploadImageToCloudinary(buffer, uploadFolder, resourceType);

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
    await trackActivity("create", "media", { entityName: file.name });
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

  const conditions = [ne(media.filename, sql`'%' || '.keep-%'`)];

  if (options?.folder && options.folder !== "all") {
    conditions.push(eq(media.folder, options.folder));
  }

  if (options?.type) {
    if (options.type === "image") {
      conditions.push(ilike(media.mimeType, "image/%"));
    } else {
      conditions.push(ilike(media.mimeType, "video/%"));
    }
  }

  if (options?.search) {
    const q = `%${options.search}%`;
    conditions.push(ilike(media.originalName, q));
  }

  const where = and(...conditions);
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const allItems = await db
    .select()
    .from(media)
    .where(where)
    .orderBy(desc(media.createdAt));

  return {
    items: allItems.filter((item) => !item.filename.startsWith(".keep-")),
    total: allItems.length,
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
  await trackActivity("delete", "media", { entityId: mediaId });
}

/** Update media alt text. */
export async function updateMediaAlt(mediaId: number, alt: string) {
  await requireAdmin();
  await db.update(media).set({ alt }).where(eq(media.id, mediaId));
  revalidatePath("/admin/media");
  await trackActivity("update", "media", { entityId: mediaId, details: { alt } });
}

/** Update media folder (move to another folder). */
export async function moveMediaToFolder(mediaId: number, folder: string) {
  await requireAdmin();
  await db.update(media).set({ folder }).where(eq(media.id, mediaId));
  revalidatePath("/admin/media");
  await trackActivity("update", "media", { entityId: mediaId, details: { folder } });
}

/** Create a new empty folder by inserting a placeholder record. */
export async function createMediaFolder(folderName: string) {
  await requireAdmin();
  const trimmed = folderName.trim().toLowerCase().replace(/[^a-z0-9/-]/g, "-");
  if (!trimmed) return { error: "Invalid folder name." };

  await db.insert(media).values({
    filename: `.keep-${trimmed}`,
    originalName: `.keep`,
    url: "data:text/plain,keep",
    mimeType: "text/plain",
    size: 0,
    folder: trimmed,
  });

  await trackActivity("create", "media", { entityName: trimmed, details: { type: "folder" } });
  return { success: true, folder: trimmed };
}

/** Delete a folder and all its items from media + Cloudinary. */
export async function deleteMediaFolder(folder: string) {
  await requireAdmin();
  const items = await db.select().from(media).where(eq(media.folder, folder));
  const config = await getCloudinaryConfig();
  if (config) {
    cloudinary.config(config);
    for (const item of items) {
      if (item.publicId) {
        try {
          await cloudinary.uploader.destroy(item.publicId, {
            resource_type: item.mimeType.startsWith("video/") ? "video" : "image",
          });
        } catch { /* best effort */ }
      }
    }
  }
  await db.delete(media).where(eq(media.folder, folder));
  revalidatePath("/admin/media");
  await trackActivity("delete", "media", { entityName: folder, details: { type: "folder", itemCount: items.length } });
}

// ------------------------------------------------------------------ nav links

export async function getNavLinks() {
  await requireAdmin();
  const siteId = await getAdminSiteId();
  const allLinks = await db.select().from(navLinks).where(eq(navLinks.siteId, siteId)).orderBy(asc(navLinks.sortOrder));
  return allLinks;
}

export async function addNavLink(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const siteId = await getAdminSiteId();
  const label = String(formData.get("label") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim();
  const external = formData.get("external") === "on";
  if (!label || !href) return { message: "Label and URL are required." };
  const all = await db.select().from(navLinks).where(eq(navLinks.siteId, siteId)).orderBy(desc(navLinks.sortOrder));
  const maxSort = all.length > 0 ? all[0].sortOrder + 1 : 0;
  await db.insert(navLinks).values({ siteId, label, href, sortOrder: maxSort, visible: true, external });
  revalidatePath("/", "layout");
  revalidatePath("/admin/navigation");
  await trackActivity("create", "navigation", { siteId, entityName: label });
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
  await trackActivity("update", "navigation", { entityId: id, entityName: label });
  return { success: true, message: "Link updated." };
}

export async function deleteNavLink(id: number) {
  await requireAdmin();
  await db.delete(navLinks).where(eq(navLinks.id, id));
  revalidatePath("/", "layout");
  revalidatePath("/admin/navigation");
  await trackActivity("delete", "navigation", { entityId: id });
}

export async function reorderNavLinks(orderedIds: number[]) {
  await requireAdmin();
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(navLinks).set({ sortOrder: i }).where(eq(navLinks.id, orderedIds[i]));
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin/navigation");
  await trackActivity("update", "navigation", { entityName: "Reordered" });
}

// ------------------------------------------------------------------ home sections

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
  await trackActivity("create", "home_section", { siteId, entityName: title ?? type });
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
  await trackActivity("update", "home_section", { entityId: id, entityName: title });
  return { success: true, message: "Section updated." };
}

export async function deleteHomeSection(id: number) {
  await requireAdmin();
  await db.delete(homeSections).where(eq(homeSections.id, id));
  revalidatePath("/", "layout");
  revalidatePath("/admin/homepage");
  await trackActivity("delete", "home_section", { entityId: id });
}

export async function reorderHomeSections(orderedIds: number[]) {
  await requireAdmin();
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(homeSections).set({ sortOrder: i }).where(eq(homeSections.id, orderedIds[i]));
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin/homepage");
  await trackActivity("update", "home_section", { entityName: "Reordered" });
}

// ------------------------------------------------------------------ sites

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

  const { sites } = await import("@/lib/db/schema");
  await db.insert(sites).values({
    name,
    slug,
    template,
    description,
    published: false,
  });
  revalidatePath("/admin/sites");
  await trackActivity("create", "site", { entityName: name });
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

  const { sites } = await import("@/lib/db/schema");
  await db
    .update(sites)
    .set({ name, description, published, updatedAt: new Date().toISOString() })
    .where(eq(sites.id, id));
  revalidatePath("/admin/sites");
  await trackActivity("update", "site", { siteId: id, entityName: name });
  return { success: true, message: "Site updated." };
}

export async function deleteSite(id: number) {
  await requireAdmin();
  const { sites } = await import("@/lib/db/schema");
  await db.delete(sites).where(eq(sites.id, id));
  revalidatePath("/admin/sites");
  await trackActivity("delete", "site", { siteId: id });
}

export async function getSites() {
  await requireAdmin();
  const { sites } = await import("@/lib/db/schema");
  return db.select().from(sites);
}

// ------------------------------------------------------------------ pages (new builder)

export async function getPages(siteId: number) {
  await requireAdmin();
  const { pages } = await import("@/lib/db/schema");
  return db.select().from(pages).where(eq(pages.siteId, siteId)).orderBy(asc(pages.sortOrder));
}

export async function getPage(id: number) {
  await requireAdmin();
  const { pages } = await import("@/lib/db/schema");
  const [page] = await db.select().from(pages).where(eq(pages.id, id));
  return page ?? null;
}

export async function createPage(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const { pages, pageBlocks } = await import("@/lib/db/schema");
  const siteId = Number(formData.get("siteId"));
  const title = String(formData.get("title") ?? "").trim();
  let slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!slug) slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!slug) slug = `page-${Date.now()}`;
  const description = String(formData.get("description") ?? "").trim() || null;
  const template = String(formData.get("template") ?? "default").trim();

  if (!siteId || !title) return { message: "Site ID and title are required." };

  const [existing] = await db
    .select()
    .from(pages)
    .where(eq(pages.siteId, siteId));
  if (existing && existing.slug === slug) {
    return { message: "A page with this slug already exists." };
  }

  const maxSort = await db
    .select({ sortOrder: pages.sortOrder })
    .from(pages)
    .where(eq(pages.siteId, siteId));

  const sortOrder = maxSort.length > 0 ? Math.max(...maxSort.map((r) => r.sortOrder)) + 1 : 0;

  const [newPage] = await db
    .insert(pages)
    .values({
      siteId,
      title,
      slug,
      description,
      template,
      published: false,
      sortOrder,
    })
    .returning();

  revalidatePath("/admin/pages");
  await trackActivity("create", "page", { siteId, entityName: title });
  return { success: true, message: `Page "${title}" created.` };
}

export async function updatePage(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const { pages } = await import("@/lib/db/schema");
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const template = String(formData.get("template") ?? "default").trim();
  const published = formData.get("published") === "on";

  if (!id || !title) return { message: "Page ID and title are required." };

  await db
    .update(pages)
    .set({ title, slug, description, template, published, updatedAt: new Date().toISOString() })
    .where(eq(pages.id, id));
  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
  await trackActivity("update", "page", { entityId: id, entityName: title });
  return { success: true, message: "Page updated." };
}

export async function deletePage(id: number) {
  await requireAdmin();
  const { pages } = await import("@/lib/db/schema");
  await db.delete(pages).where(eq(pages.id, id));
  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
  await trackActivity("delete", "page", { entityId: id });
}

export async function reorderPages(orderedIds: number[]) {
  await requireAdmin();
  const { pages } = await import("@/lib/db/schema");
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(pages).set({ sortOrder: i }).where(eq(pages.id, orderedIds[i]));
  }
  revalidatePath("/admin/pages");
  await trackActivity("update", "page", { entityName: "Reordered" });
}

// ------------------------------------------------------------------ page blocks

export async function getPageBlocks(pageId: number) {
  await requireAdmin();
  const { pageBlocks } = await import("@/lib/db/schema");
  return db.select().from(pageBlocks).where(eq(pageBlocks.pageId, pageId)).orderBy(asc(pageBlocks.sortOrder));
}

export async function addPageBlock(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const { pageBlocks } = await import("@/lib/db/schema");
  const { getDefaultConfig } = await import("@/lib/blocks");
  const pageId = Number(formData.get("pageId"));
  const type = String(formData.get("type") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || null;

  if (!pageId || !type) return { message: "Page ID and block type are required." };

  const maxSort = await db
    .select({ sortOrder: pageBlocks.sortOrder })
    .from(pageBlocks)
    .where(eq(pageBlocks.pageId, pageId));
  const sortOrder = maxSort.length > 0 ? Math.max(...maxSort.map((r) => r.sortOrder)) + 1 : 0;

  const defaultConfig = getDefaultConfig(type);

  await db.insert(pageBlocks).values({
    pageId,
    type,
    title,
    sortOrder,
    visible: true,
    config: Object.keys(defaultConfig).length > 0 ? JSON.stringify(defaultConfig) : null,
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
  await trackActivity("create", "page_block", { entityId: pageId, entityName: title ?? type });
  return { success: true, message: "Block added." };
}

export async function updatePageBlock(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const { pageBlocks } = await import("@/lib/db/schema");
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim() || null;
  const visible = formData.get("visible") === "on";
  const config = String(formData.get("config") ?? "").trim() || null;

  if (!id) return { message: "Block ID is required." };

  await db
    .update(pageBlocks)
    .set({ title, visible, config, updatedAt: new Date().toISOString() })
    .where(eq(pageBlocks.id, id));

  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
  await trackActivity("update", "page_block", { entityId: id, entityName: title });
  return { success: true, message: "Block updated." };
}

export async function deletePageBlock(id: number) {
  await requireAdmin();
  const { pageBlocks } = await import("@/lib/db/schema");
  await db.delete(pageBlocks).where(eq(pageBlocks.id, id));
  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
  await trackActivity("delete", "page_block", { entityId: id });
}

export async function reorderPageBlocks(orderedIds: number[]) {
  await requireAdmin();
  const { pageBlocks } = await import("@/lib/db/schema");
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(pageBlocks).set({ sortOrder: i }).where(eq(pageBlocks.id, orderedIds[i]));
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
  await trackActivity("update", "page_block", { entityName: "Reordered" });
}

// ------------------------------------------------------------------ admin users

export async function getAdminUsers() {
  await requireAdmin();
  const { adminUsers } = await import("@/lib/db/schema");
  return db.select().from(adminUsers);
}

export async function getSitesForCurrentUser() {
  await requireAdmin();
  const { getAllAdminSites } = await import("@/lib/admin-site");
  return getAllAdminSites();
}

export async function createAdminUser(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const user = await requireAdmin();
  const { adminUsers } = await import("@/lib/db/schema");
  const { hashPassword } = await import("@/lib/password");
  const { hasMinRole } = await import("@/lib/auth");

  // Only admin+ can create users
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

  // Only super_admin can create other super_admins
  if (role === "super_admin" && userRole !== "super_admin") {
    return { message: "Only super admins can create super admin accounts." };
  }

  // Non-super-admins can only assign users to their own site
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
  await trackActivity("create", "user", { siteId, entityName: name, details: { email, role } });
  return { success: true, message: "User created." };
}

export async function updateAdminUser(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const currentUser = await requireAdmin();
  const { adminUsers } = await import("@/lib/db/schema");
  const { hasMinRole } = await import("@/lib/auth");

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

  // Only super_admin can change roles to super_admin
  if (role === "super_admin" && userRole !== "super_admin") {
    return { message: "Only super admins can assign super admin role." };
  }

  // Cannot change your own role
  if (id === currentUser.id && role !== currentUser.role) {
    return { message: "You cannot change your own role." };
  }

  // Non-super-admins can only assign users to their own site
  if (userRole !== "super_admin" && currentUser.siteId) {
    if (siteId && siteId !== currentUser.siteId) {
      return { message: "You can only assign users to your own site." };
    }
  }

  const updateData: Record<string, unknown> = { name, email, role, siteId: siteId || null };

  // Only update password if provided
  if (newPassword) {
    if (newPassword.length < 6) {
      return { message: "Password must be at least 6 characters." };
    }
    const { hashPassword } = await import("@/lib/password");
    updateData.passwordHash = await hashPassword(newPassword);
  }

  await db
    .update(adminUsers)
    .set(updateData)
    .where(eq(adminUsers.id, id));

  revalidatePath("/admin/users");
  await trackActivity("update", "user", { siteId, entityId: id, entityName: name, details: { email, role } });
  return { success: true, message: "User updated." };
}

export async function deleteAdminUser(id: number) {
  const currentUser = await requireAdmin();
  const { adminUsers } = await import("@/lib/db/schema");
  const { hasMinRole } = await import("@/lib/auth");

  const userRole = (currentUser.role as string) ?? "viewer";
  if (!hasMinRole(userRole as "admin" | "super_admin" | "editor" | "viewer", "admin")) {
    return { message: "You don't have permission to delete users." };
  }

  // Cannot delete yourself
  if (id === currentUser.id) {
    return { message: "You cannot delete your own account." };
  }

  await db.delete(adminUsers).where(eq(adminUsers.id, id));
  revalidatePath("/admin/users");
  await trackActivity("delete", "user", { entityId: id });
}
