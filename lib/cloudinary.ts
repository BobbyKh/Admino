import "server-only";

import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { buildTenantUploadFolder } from "@/lib/upload-validation";

/**
 * Cloudinary helpers with DYNAMIC credentials.
 *
 * Credentials are resolved in this order:
 *   1. Admin panel settings (Settings → Cloudinary) — saved to the DB
 *   2. Environment variables (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET)
 * So you can manage them from the admin UI without touching .env or code.
 */

export async function getCloudinaryConfig(siteId: number) {
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(and(eq(settings.siteId, siteId), inArray(settings.key, ["cloudinaryCloudName", "cloudinaryApiKey", "cloudinaryApiSecret"])));
  const values = new Map(rows.map((row) => [row.key, row.value.trim()]));
  const tenant = {
    cloud_name: values.get("cloudinaryCloudName") ?? "",
    api_key: values.get("cloudinaryApiKey") ?? "",
    api_secret: values.get("cloudinaryApiSecret") ?? "",
  };
  const tenantValues = Object.values(tenant);
  if (tenantValues.every(Boolean)) return tenant;
  if (tenantValues.some(Boolean)) throw new Error("Cloudinary credentials are incomplete for this site.");

  const environment = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    api_key: process.env.CLOUDINARY_API_KEY ?? "",
    api_secret: process.env.CLOUDINARY_API_SECRET ?? "",
  };
  return Object.values(environment).every(Boolean) ? environment : null;
}

export async function uploadImageToCloudinary(
  siteId: number,
  buffer: Buffer,
  folder = "media",
  resourceType: "image" | "video" | "auto" = "image"
): Promise<{ secure_url: string; public_id: string; width: number; height: number }> {
  const config = await getCloudinaryConfig(siteId);
  if (!config) {
    throw new Error(
      "Cloudinary is not configured. Add your credentials in Admin → Settings → Cloudinary, or set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."
    );
  }
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const tenantFolder = buildTenantUploadFolder(siteId, folder);
  const signature = signCloudinary({ folder: tenantFolder, timestamp }, config.api_secret);
  const body = new FormData();
  body.set("file", new Blob([new Uint8Array(buffer)]));
  body.set("api_key", config.api_key);
  body.set("timestamp", timestamp);
  body.set("folder", tenantFolder);
  body.set("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloud_name)}/${resourceType}/upload`, {
    method: "POST",
    body,
  });
  const result = await response.json() as { secure_url?: string; public_id?: string; width?: number; height?: number; error?: { message?: string } };
  if (!response.ok || !result.secure_url || !result.public_id) {
    throw new Error(result.error?.message || "Cloudinary upload failed");
  }
  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
    width: result.width ?? 0,
    height: result.height ?? 0,
  };
}

export async function deleteCloudinaryAsset(siteId: number, publicId: string, resourceType: "image" | "video") {
  const config = await getCloudinaryConfig(siteId);
  if (!config) throw new Error("Cloudinary is not configured.");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = { invalidate: "true", public_id: publicId, timestamp };
  const body = new URLSearchParams({
    ...params,
    api_key: config.api_key,
    signature: signCloudinary(params, config.api_secret),
  });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloud_name)}/${resourceType}/destroy`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error("Cloudinary deletion failed.");
}

function signCloudinary(params: Record<string, string>, secret: string) {
  const value = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${key}=${item}`)
    .join("&");
  return createHash("sha1").update(`${value}${secret}`).digest("hex");
}
