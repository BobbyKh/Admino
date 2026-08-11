const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export type UploadResourceType = "image" | "video";

export function validateUploadBuffer(buffer: Buffer, mimeType: string, allowed: UploadResourceType[] = ["image", "video"]) {
  if (buffer.length < 12) throw new Error("File is too small to validate.");

  const allowsImage = allowed.includes("image");
  const allowsVideo = allowed.includes("video");
  const isAllowedImage = allowsImage && IMAGE_MIME_TYPES.has(mimeType) && matchesImageSignature(buffer, mimeType);
  const isAllowedVideo = allowsVideo && VIDEO_MIME_TYPES.has(mimeType) && matchesVideoSignature(buffer, mimeType);

  if (isAllowedImage) return "image" as const;
  if (isAllowedVideo) return "video" as const;

  throw new Error(allowsVideo ? "Only JPEG, PNG, GIF, WebP, AVIF, MP4, MOV, and WebM files are allowed." : "Only JPEG, PNG, GIF, WebP, and AVIF image files are allowed.");
}

function matchesImageSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/gif") return buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a";
  if (mimeType === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (mimeType === "image/avif") return buffer.subarray(4, 8).toString("ascii") === "ftyp" && ["avif", "avis"].includes(buffer.subarray(8, 12).toString("ascii"));
  return false;
}

function matchesVideoSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "video/webm") return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (mimeType === "video/mp4" || mimeType === "video/quicktime") return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  return false;
}

export function sanitizeUploadFolder(value: string) {
  const folder = value.trim().toLowerCase().replace(/[^a-z0-9/-]/g, "-").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "");
  return folder || "admino/media";
}

export function buildTenantUploadFolder(siteId: number, value?: string) {
  if (!Number.isInteger(siteId) || siteId < 1) throw new Error("Invalid site ID.");
  const relative = sanitizeUploadFolder(value || "media")
    .replace(/^sites\/\d+(?:\/|$)/, "")
    .replace(/^admino(?:\/|$)/, "") || "media";
  return `sites/${siteId}/${relative}`;
}
