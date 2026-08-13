"use client";

import * as React from "react";
import { ImageIcon, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaLibrary } from "./media-library";
import type { Media } from "@/lib/db/schema";
import { useAdminSiteId } from "./admin-site-context";

/**
 * File-upload field that pushes the chosen image to Cloudinary (credentials
 * come from env vars at runtime) and stores the returned secure URL in the
 * form's src/image field. The URL input remains as a manual fallback.
 * Includes a Media Library button to pick from existing uploads.
 */
export function ImageUploadField({
  name,
  value,
  onChange,
  label = "Image",
  required,
  placeholder = "https://… (or use the upload button)",
}: {
  name: string;
  value: string;
  onChange: (url: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const siteId = useAdminSiteId();
  const [uploading, setUploading] = React.useState(false);
  const [mediaOpen, setMediaOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("siteId", String(siteId));
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await response.json();
      if (response.ok && result.url) {
        onChange(result.url);
        toast.success("Image uploaded to the media library");
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

      {value && (
        <div className="relative size-24 overflow-hidden rounded-md border bg-muted">
          {isPreviewableImageSource(value) ? (
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
          {uploading ? "Uploading…" : "Upload image"}
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
          accept="image/*"
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
        filter="image"
      />
    </div>
  );
}

function isPreviewableImageSource(value: string) {
  return value.startsWith("/") || /^https?:\/\//i.test(value);
}
