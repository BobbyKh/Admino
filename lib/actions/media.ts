"use server";

import { revalidatePath } from "next/cache";
import { count, eq, desc, ilike, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { getCurrentSiteRequiringFeature, getCurrentSiteRequiringFeatureForRole, getCurrentSiteWithFeatureForRole } from "@/lib/tenant-access";
import { uploadImageToCloudinary, getCloudinaryConfig } from "@/lib/cloudinary";
import { v2 as cloudinary } from "cloudinary";
import { sanitizeUploadFolder, validateUploadBuffer } from "@/lib/upload-validation";
import type { MediaUploadState } from "./types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function uploadMedia(
  formData: FormData,
  folder?: string
): Promise<MediaUploadState> {
  const { siteId, denied } = await getCurrentSiteWithFeatureForRole("media", "editor");
  if (denied) return { error: denied };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file." };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB.` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadFolder = sanitizeUploadFolder(folder || "admino/media");
  let resourceType: "image" | "video";
  try {
    resourceType = validateUploadBuffer(buffer, file.type);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid upload file." };
  }

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
      siteId,
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
      error: "Upload failed. Check your Cloudinary credentials in Admin → Settings.",
    };
  }
}

export async function getMediaItems(options?: {
  folder?: string;
  search?: string;
  type?: "image" | "video";
  limit?: number;
  offset?: number;
}) {
  const siteId = await getCurrentSiteRequiringFeature("media");

  const conditions = [eq(media.siteId, siteId)];

  if (!options?.folder || options.folder === "all") {
    // No folder filter
  } else {
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

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const [countResult] = await db
    .select({ value: count() })
    .from(media)
    .where(where);

  const items = await db
    .select()
    .from(media)
    .where(where)
    .orderBy(desc(media.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    items: items.filter((item) => !item.filename.startsWith(".keep-")),
    total: countResult?.value ?? 0,
  };
}

export async function getMediaFolders() {
  const siteId = await getCurrentSiteRequiringFeature("media");
  const allItems = await db.select({ folder: media.folder }).from(media).where(eq(media.siteId, siteId));
  const folders = [...new Set(allItems.map((item) => item.folder))].sort();
  return folders;
}

export async function deleteMediaItem(mediaId: number) {
  const siteId = await getCurrentSiteRequiringFeatureForRole("media", "editor");
  await db.delete(media).where(and(eq(media.id, mediaId), eq(media.siteId, siteId)));
  revalidatePath("/admin/media");
}

export async function updateMediaAlt(mediaId: number, alt: string) {
  const siteId = await getCurrentSiteRequiringFeatureForRole("media", "editor");
  await db.update(media).set({ alt }).where(and(eq(media.id, mediaId), eq(media.siteId, siteId)));
  revalidatePath("/admin/media");
}

export async function moveMediaToFolder(mediaId: number, folder: string) {
  const siteId = await getCurrentSiteRequiringFeatureForRole("media", "editor");
  await db.update(media).set({ folder }).where(and(eq(media.id, mediaId), eq(media.siteId, siteId)));
  revalidatePath("/admin/media");
}

export async function createMediaFolder(folderName: string) {
  const { siteId, denied } = await getCurrentSiteWithFeatureForRole("media", "editor");
  if (denied) return { error: denied };
  const trimmed = folderName.trim().toLowerCase().replace(/[^a-z0-9/-]/g, "-");
  if (!trimmed) return { error: "Invalid folder name." };

  await db.insert(media).values({
    filename: `.keep-${trimmed}`,
    originalName: `.keep`,
    url: "data:text/plain,keep",
    mimeType: "text/plain",
    size: 0,
    folder: trimmed,
    siteId,
  });

  return { success: true, folder: trimmed };
}

export async function deleteMediaFolder(folder: string) {
  const siteId = await getCurrentSiteRequiringFeatureForRole("media", "editor");
  const items = await db.select().from(media).where(and(eq(media.folder, folder), eq(media.siteId, siteId)));
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
  await db.delete(media).where(and(eq(media.folder, folder), eq(media.siteId, siteId)));
  revalidatePath("/admin/media");
}
