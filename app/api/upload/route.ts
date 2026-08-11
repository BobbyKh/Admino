import { NextRequest, NextResponse } from "next/server";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { getSessionUser, hasMinRole, type Role } from "@/lib/auth";
import { requireTenantFeature } from "@/lib/tenant-features";
import { sanitizeUploadFolder, validateUploadBuffer } from "@/lib/upload-validation";
import { requireSiteAccess } from "@/lib/tenant-access";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (user.role as Role) ?? "viewer";
    if (!hasMinRole(role, "editor")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    let siteId: number;
    if (role === "super_admin") {
      const selectedSiteId = Number(formData.get("siteId"));
      if (!Number.isInteger(selectedSiteId) || selectedSiteId < 1) {
        return NextResponse.json({ error: "Select a site before uploading." }, { status: 400 });
      }
      await requireSiteAccess(selectedSiteId);
      siteId = selectedSiteId;
    } else {
      if (!user.siteId) return NextResponse.json({ error: "No site is assigned to this user." }, { status: 403 });
      siteId = user.siteId;
    }
    await requireTenantFeature(siteId, "media", { role, userId: user.id });

    const file = formData.get("file") as File | null;
    const folder = sanitizeUploadFolder(String(formData.get("folder") ?? "media"));

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Please choose a file." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB.` },                                                          
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let resourceType: "image" | "video";
    try {
      resourceType = validateUploadBuffer(buffer, file.type);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid upload file." }, { status: 400 });
    }
    const result = await uploadImageToCloudinary(siteId, buffer, folder, resourceType);

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
      folder,
      siteId,
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload failed. Check your Cloudinary credentials in Admin → Settings." },
      { status: 500 }
    );
  }
}
