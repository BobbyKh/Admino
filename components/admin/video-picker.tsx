"use client";

import * as React from "react";
import { Film, Loader2, UploadCloud } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaLibrary } from "./media-library";
import type { Media } from "@/lib/db/schema";

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?#]+)/
  );
  return match ? match[1] : null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

function getEmbedUrl(url: string): string | null {
  const ytId = getYouTubeId(url);
  if (ytId) return `https://www.youtube.com/embed/${ytId}`;
  const vimeoId = getVimeoId(url);
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;
  return null;
}

export function VideoPicker({
  name,
  value,
  posterName,
  posterValue,
  label = "Video URL",
  description,
  onChange,
  onPosterChange,
}: {
  name: string;
  value: string;
  posterName: string;
  posterValue: string;
  label?: string;
  description?: string;
  onChange?: (url: string) => void;
  onPosterChange?: (url: string) => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const [mediaOpen, setMediaOpen] = React.useState(false);
  const [posterOpen, setPosterOpen] = React.useState(false);
  const [posterSrc, setPosterSrc] = React.useState(posterValue);
  const [videoSrc, setVideoSrc] = React.useState(value);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const embedUrl = getEmbedUrl(videoSrc);
  const isDirectVideo =
    videoSrc.match(/\.(mp4|webm|ogg)$/i) !== null;
  const isCloudinaryVideo =
    videoSrc.includes("cloudinary.com") && videoSrc.includes("/video/");

  function setVideo(url: string) {
    setVideoSrc(url);
    onChange?.(url);
  }

  function setPoster(url: string) {
    setPosterSrc(url);
    onPosterChange?.(url);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (res.ok && result.url) {
        setVideo(result.url);
        toast.success("Video uploaded to the media library");
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
    setVideo(media.url);
    toast.success("Video selected from library");
  }

  function handlePosterSelect(media: Media) {
    setPoster(media.url);
    toast.success("Poster image selected");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
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
            {uploading ? "Uploading..." : "Upload video"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMediaOpen(true)}
            className="gap-2"
          >
            <Film className="size-4" />
            Media Library
          </Button>

          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
        <Input
          name={name}
          type="url"
          value={videoSrc}
          onChange={(e) => setVideo(e.target.value)}
          placeholder="YouTube, Vimeo URL, or direct video link"
        />
      </div>

      {/* Poster / thumbnail */}
      <div className="space-y-2">
        <Label>Poster / Thumbnail</Label>
        <p className="text-xs text-muted-foreground">
          Shown before the video plays. If blank, auto-generated from the video.
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPosterOpen(true)}
            className="gap-2"
          >
            <Film className="size-4" />
            Choose poster
          </Button>
        </div>
        <Input
          name={posterName}
          type="url"
          value={posterSrc}
          onChange={(e) => setPoster(e.target.value)}
          placeholder="Poster image URL (optional)"
        />
        {posterSrc && (
          <div className="relative mt-2 h-32 w-48 overflow-hidden rounded-md border bg-muted">
            <Image
              src={posterSrc}
              alt="Video poster"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
      </div>

      {/* Preview */}
      {(embedUrl || isDirectVideo || isCloudinaryVideo) && (
        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="relative aspect-video w-full max-w-lg overflow-hidden rounded-lg border bg-black">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                className="size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={videoSrc}
                poster={posterSrc || undefined}
                controls
                className="size-full object-contain"
              />
            )}
          </div>
        </div>
      )}

      {!embedUrl && !isDirectVideo && !isCloudinaryVideo && videoSrc && (
        <p className="text-xs text-muted-foreground">
          Paste a YouTube or Vimeo URL to see a preview, or upload a video file.
        </p>
      )}

      {/* Media library dialogs */}
      <MediaLibrary
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        onSelect={handleMediaSelect}
        filter="video"
        title="Select Video"
      />
      <MediaLibrary
        open={posterOpen}
        onOpenChange={setPosterOpen}
        onSelect={handlePosterSelect}
        filter="image"
        title="Select Poster Image"
      />
    </div>
  );
}
