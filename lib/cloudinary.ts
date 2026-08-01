import "server-only";

import { cache } from "react";
import { v2 as cloudinary } from "cloudinary";
import { getSettingsRows } from "@/lib/settings-admin";

/**
 * Cloudinary helpers with DYNAMIC credentials.
 *
 * Credentials are resolved in this order:
 *   1. Admin panel settings (Settings → Cloudinary) — saved to the DB
 *   2. Environment variables (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET)
 * So you can manage them from the admin UI without touching .env or code.
 */

export const getCloudinaryConfig = cache(async () => {
  const rows = await getSettingsRows();
  const cloud_name =
    rows.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME || "";
  const api_key =
    rows.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY || "";
  const api_secret =
    rows.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET || "";
  if (!cloud_name || !api_key || !api_secret) return null;
  return { cloud_name, api_key, api_secret };
});

export async function uploadImageToCloudinary(
  buffer: Buffer,
  folder = "maiti",
  resourceType: "image" | "video" | "auto" = "image"
): Promise<{ secure_url: string; public_id: string; width: number; height: number }> {
  const config = await getCloudinaryConfig();
  if (!config) {
    throw new Error(
      "Cloudinary is not configured. Add your credentials in Admin → Settings → Cloudinary, or set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."
    );
  }
  cloudinary.config(config);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          width: result.width ?? 0,
          height: result.height ?? 0,
        });
      }
    );
    stream.end(buffer);
  });
}
