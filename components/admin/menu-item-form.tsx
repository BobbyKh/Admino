"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addMenuItem, type AdminActionState } from "@/lib/actions/index";
import type { MenuCategory } from "@/lib/db/schema";
import { ImageUploadField } from "@/components/admin/image-upload-field";

const initialState: AdminActionState = {};

export function AddMenuItemForm({
  categories,
  categoryId,
  children,
}: {
  categories: MenuCategory[];
  categoryId?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [image, setImage] = React.useState("");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setImage("");
      setError(null);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await addMenuItem(initialState, formData);
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
          <DialogTitle>Add menu item</DialogTitle>
          <DialogDescription>
            Add a dish with name, price (NPR) and optional details.
          </DialogDescription>
        </DialogHeader>
        <form
          key={open ? "open" : "closed"}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="mi-name">Name *</Label>
            <Input
              id="mi-name"
              name="name"
              placeholder="e.g. Chicken Momo"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mi-category">Category *</Label>
            <Select
              name="categoryId"
              defaultValue={String(categoryId ?? categories[0]?.id ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mi-price">Price (NPR) *</Label>
              <Input
                id="mi-price"
                name="price"
                type="number"
                min={0}
                placeholder="250"
                required
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="featured"
                  className="size-4 rounded border-input"
                />
                Featured
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mi-desc">Description</Label>
            <Textarea
              id="mi-desc"
              name="description"
              rows={2}
              placeholder="Short description (optional)"
            />
          </div>
          <div className="space-y-2">
            <ImageUploadField
              name="image"
              value={image}
              onChange={setImage}
              label="Image (optional)"
              placeholder="Upload a photo or paste an image URL"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Add item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
