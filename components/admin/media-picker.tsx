"use client";

import * as React from "react";
import { ImageIcon, Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadMedia } from "@/lib/actions/index";
import { MediaLibrary } from "./media-library";
import type { Media } from "@/lib/db/schema";
import { useAdminSiteId } from "./admin-site-context";

/**
 * Reusable image upload field with Media Library integration.
 * - Upload directly via file picker
 * - Open Media Library to select from existing uploads
 * - Manual URL input as fallback
 */
export function MediaPicker({
  name,
  value,
  onChange,
  label = "Image",
  required,
  placeholder = "https://… or use the buttons below",
  showPreview = true,
  type = "image",
}: {
  name: string;
  value: string;
  onChange: (url: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  showPreview?: boolean;
  type?: "image" | "video";
}) {
  const siteId = useAdminSiteId();
  const acceptType = type === "video" ? "video/*" : "image/*";
  const [uploading, setUploading] = React.useState(false);
  const [mediaOpen, setMediaOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadMedia(formData, undefined, siteId);
      if (result?.url) {
        onChange(result.url);
        toast.success("Image uploaded to Media Library");
      } else {
        toast.error(result?.error ?? "Upload failed.");
      }
    } catch {
      toast.error("Upload failed. Check your Cloudinary credentials.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleMediaSelect(media: Media) {
    onChange(media.url);
    toast.success("Image selected from library");
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>

{/* Preview */}
      {showPreview && value && (
        <div className="relative size-24 overflow-hidden rounded-md border bg-muted">
          {type === "video" && isVideoUrl(value) ? (
            <video
              src={value}
              className="size-full object-cover"
              controls
            />
          ) : isPreviewableImageSource(value) ? (
            <Image
              src={value}
              alt="Preview"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <ImageIcon className="size-8 text-muted-foreground" />
            </div>
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 hover:bg-background"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="gap-2"
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UploadCloud className="size-4" />
          )}
          {uploading ? "Uploading…" : "Upload file"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMediaOpen(true)}
          className="gap-2"
        >
          <ImageIcon className="size-4" />
          Media Library
        </Button>

        <input
          ref={fileRef}
          type="file"
          accept={acceptType}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <Input
        id={name}
        name={name}
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />

      <MediaLibrary
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        onSelect={handleMediaSelect}
        filter={type}
      />
    </div>
  );
}

function isPreviewableImageSource(value: string) {
  return value.startsWith("/") || /^https?:\/\//i.test(value);
}

function isVideoUrl(value: string) {
  return /\.(mp4|webm|ogg)$/i.test(value) || value.includes("/video/");
}
