"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addGalleryImage, updateGalleryImage, type AdminActionState } from "@/lib/actions/index";
import type { GalleryImage } from "@/lib/db/schema";
import { ImageUploadField } from "@/components/admin/image-upload-field";

const initialState: AdminActionState = {};

export function GalleryImageForm({
  image,
  children,
}: {
  image?: GalleryImage;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [src, setSrc] = React.useState(image?.src ?? "");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setSrc(image?.src ?? "");
      setError(null);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const action = image ? updateGalleryImage : addGalleryImage;

    startTransition(async () => {
      const result = await action(initialState, formData);
      if (result?.success) {
        toast.success(result.message ?? "Saved!");
        setError(null);
        setOpen(false);
      } else {
        setError(result?.message ?? "Something went wrong.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {image ? "Edit image" : "Add image to gallery"}
          </DialogTitle>
          <DialogDescription>
            Provide an image URL (e.g. an Unsplash link) and optional details.
          </DialogDescription>
        </DialogHeader>
        <form
          key={open ? "open" : "closed"}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {image && <input type="hidden" name="id" value={image.id} />}
          <div className="space-y-2">
            <Label htmlFor="g-title">Title *</Label>
            <Input
              id="g-title"
              name="title"
              defaultValue={image?.title}
              placeholder="e.g. Outdoor seating"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-alt">Alt text</Label>
            <Input
              id="g-alt"
              name="alt"
              defaultValue={image?.alt}
              placeholder="Description for accessibility"
            />
          </div>
          <div className="space-y-2">
            <ImageUploadField
              name="src"
              value={src}
              onChange={setSrc}
              label="Image"
              required
              placeholder="Upload a photo or paste an image URL"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="g-category">Category</Label>
              <Input
                id="g-category"
                name="category"
                defaultValue={image?.category ?? "All"}
                placeholder="Resort, Food, Events…"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="featured"
                  defaultChecked={image?.featured}
                  className="size-4 rounded border-input"
                />
                Featured on home
              </label>
            </div>
          </div>
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending && <Loader2 className="size-4 animate-spin" />}
              {image ? "Save changes" : "Add image"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
