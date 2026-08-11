"use server";

import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { requireSiteFeatureForRole } from "@/lib/tenant-access";
import { validateUploadBuffer } from "@/lib/upload-validation";
import type { UploadState } from "./types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadImage(formData: FormData, siteId: number): Promise<UploadState> {
  try {
    await requireSiteFeatureForRole(siteId, "media", "editor");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Access denied." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose an image file." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB.` };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    validateUploadBuffer(buffer, file.type, ["image"]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid image file." };
  }
  try {
    const { secure_url } = await uploadImageToCloudinary(siteId, buffer, "uploads");
    return { url: secure_url };
  } catch (err) {
    console.error("Cloudinary upload failed:", err);
    return {
      error: "Upload failed. Add your Cloudinary credentials in Admin → Settings → Cloudinary (or set the CLOUDINARY_* env vars).",
    };
  }
}
