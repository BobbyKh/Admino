import { NextRequest, NextResponse } from "next/server";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "maiti/media";

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Please choose a file." }, { status: 400 });
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "Only image and video files are allowed." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const resourceType = isVideo ? "video" : "image";
    const result = await uploadImageToCloudinary(buffer, folder, resourceType);

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
