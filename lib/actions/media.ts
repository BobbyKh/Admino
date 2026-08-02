"use server";

import { revalidatePath } from "next/cache";
import { eq, desc, ilike, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { uploadImageToCloudinary, getCloudinaryConfig } from "@/lib/cloudinary";
import { v2 as cloudinary } from "cloudinary";
import type { MediaUploadState } from "./types";

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
  await requireAdmin();

  const conditions = [];

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
    .select({ count: media.id })
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
    total: countResult?.count ?? 0,
  };
}

export async function getMediaFolders() {
  await requireAdmin();
  const allItems = await db.select({ folder: media.folder }).from(media);
  const folders = [...new Set(allItems.map((item) => item.folder))].sort();
  return folders;
}

export async function deleteMediaItem(mediaId: number) {
  await requireAdmin();
  await db.delete(media).where(eq(media.id, mediaId));
  revalidatePath("/admin/media");
}

export async function updateMediaAlt(mediaId: number, alt: string) {
  await requireAdmin();
  await db.update(media).set({ alt }).where(eq(media.id, mediaId));
  revalidatePath("/admin/media");
}

export async function moveMediaToFolder(mediaId: number, folder: string) {
  await requireAdmin();
  await db.update(media).set({ folder }).where(eq(media.id, mediaId));
  revalidatePath("/admin/media");
}

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

  return { success: true, folder: trimmed };
}

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
}
