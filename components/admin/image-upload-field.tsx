"use client";

import * as React from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImage } from "@/lib/cms-actions";

/**
 * File-upload field that pushes the chosen image to Cloudinary (credentials
 * come from env vars at runtime) and stores the returned secure URL in the
 * form's src/image field. The URL input remains as a manual fallback.
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
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadImage(formData);
      if (result?.url) {
        onChange(result.url);
        toast.success("Image uploaded to Cloudinary");
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

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex items-center gap-3">
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
        {value && (
          <span className="truncate text-xs text-muted-foreground">
            ✓ {value.length > 48 ? `${value.slice(0, 48)}…` : value}
          </span>
        )}
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
    </div>
  );
}
