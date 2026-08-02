"use server";

import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/auth";
import type { UploadState } from "./types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadImage(formData: FormData): Promise<UploadState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose an image file." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB.` };
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
      error: "Upload failed. Add your Cloudinary credentials in Admin → Settings → Cloudinary (or set the CLOUDINARY_* env vars).",
    };
  }
}
