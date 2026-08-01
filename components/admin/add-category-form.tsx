"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addMenuCategory, type AdminActionState } from "@/lib/cms-actions";

const initialState: AdminActionState = {};

export function AddCategoryForm() {
  const [state, formAction, pending] = useActionState(addMenuCategory, initialState);

  React.useEffect(() => {
    if (state?.success) {
      toast.success(state.message ?? "Category added.");
    } else if (state?.message && !state.success) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="mc-name">Name *</Label>
        <Input id="mc-name" name="name" placeholder="e.g. Breakfast" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mc-slug">Slug (optional)</Label>
        <Input id="mc-slug" name="slug" placeholder="breakfast" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mc-desc">Description</Label>
        <Input id="mc-desc" name="description" placeholder="Short tagline" />
      </div>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add category"}
        </Button>
      </div>
    </form>
  );
}
