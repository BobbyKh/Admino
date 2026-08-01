"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  Blocks,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  addHomeSection,
  deleteHomeSection,
  getHomeSections,
  reorderHomeSections,
  updateHomeSection,
} from "@/lib/cms-actions";
import type { HomeSection } from "@/lib/db/schema";

const SECTION_TYPES = [
  { value: "hero", label: "Hero Banner", description: "Main hero section with background image" },
  { value: "features", label: "Features Grid", description: "Feature cards grid" },
  { value: "about", label: "About Section", description: "About us with image" },
  { value: "video", label: "Video Section", description: "Embedded video player" },
  { value: "menuPreview", label: "Menu Preview", description: "Featured menu items" },
  { value: "gallery", label: "Gallery Preview", description: "Gallery image grid" },
  { value: "cta", label: "Call to Action", description: "CTA banner with buttons" },
  { value: "banner", label: "Banner Image", description: "Full-width image banner" },
  { value: "customHtml", label: "Custom HTML", description: "Custom content block" },
];

function getTypeLabel(type: string) {
  return SECTION_TYPES.find((t) => t.value === type)?.label ?? type;
}

export default function HomepageSectionsPage() {
  const [sections, setSections] = React.useState<HomeSection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pending, startTransition] = React.useTransition();
  const [showAdd, setShowAdd] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);

  React.useEffect(() => {
    getHomeSections()
      .then(setSections)
      .finally(() => setLoading(false));
  }, []);

  function moveUp(index: number) {
    if (index === 0) return;
    const updated = [...sections];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setSections(updated);
    startTransition(async () => {
      await reorderHomeSections(updated.map((s) => s.id));
    });
  }

  function moveDown(index: number) {
    if (index === sections.length - 1) return;
    const updated = [...sections];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setSections(updated);
    startTransition(async () => {
      await reorderHomeSections(updated.map((s) => s.id));
    });
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addHomeSection({}, formData);
      if (result?.success) {
        toast.success(result.message);
        setShowAdd(false);
        const updated = await getHomeSections();
        setSections(updated);
      } else {
        toast.error(result?.message ?? "Failed");
      }
    });
  }

  function handleUpdate(id: number, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("id", String(id));
    startTransition(async () => {
      const result = await updateHomeSection({}, formData);
      if (result?.success) {
        toast.success(result.message);
        setEditingId(null);
        const updated = await getHomeSections();
        setSections(updated);
      } else {
        toast.error(result?.message ?? "Failed");
      }
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      await deleteHomeSection(id);
      setSections((prev) => prev.filter((s) => s.id !== id));
      toast.success("Section deleted");
    });
  }

  function handleToggleVisibility(id: number, visible: boolean) {
    const section = sections.find((s) => s.id === id);
    if (!section) return;
    const formData = new FormData();
    formData.set("id", String(id));
    formData.set("title", section.title ?? "");
    if (visible) formData.set("visible", "on");
    if (section.config) formData.set("config", section.config);
    startTransition(async () => {
      await updateHomeSection({}, formData);
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, visible } : s)));
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Homepage Sections</h1>
          <p className="text-sm text-muted-foreground">
            Arrange and configure the sections shown on the homepage. Drag to reorder.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="size-4" />
          Add Section
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Add Section</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>Section Type</Label>
                <select
                  name="type"
                  required
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select type...</option>
                  {SECTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label} — {t.description}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Title (optional)</Label>
                <Input name="title" placeholder="Section heading" className="w-56" />
              </div>
              <Button type="submit" disabled={pending} size="sm">
                {pending ? <Loader2 className="size-4 animate-spin" /> : "Add"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Sections ({sections.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {sections.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No sections yet. Add one to build your homepage.
            </p>
          )}
          {sections.map((section, i) => (
            <div
              key={section.id}
              className="rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    disabled={i === 0}
                    onClick={() => moveUp(i)}
                  >
                    <ArrowUp className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    disabled={i === sections.length - 1}
                    onClick={() => moveDown(i)}
                  >
                    <ArrowDown className="size-3" />
                  </Button>
                </div>

                <Blocks className="size-4 shrink-0 text-muted-foreground" />

                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium">
                    {getTypeLabel(section.type)}
                  </span>
                  {section.title && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      — {section.title}
                    </span>
                  )}
                </div>

                <Switch
                  checked={section.visible}
                  onCheckedChange={(val) => handleToggleVisibility(section.id, val)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setEditingId(editingId === section.id ? null : section.id)
                  }
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(section.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {editingId === section.id && (
                <form
                  onSubmit={(e) => handleUpdate(section.id, e)}
                  className="mt-3 space-y-3 border-t pt-3"
                >
                  <div className="space-y-1.5">
                    <Label>Section Title</Label>
                    <Input name="title" defaultValue={section.title ?? ""} placeholder="Optional heading" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Config JSON (section-specific settings)</Label>
                    <Textarea
                      name="config"
                      defaultValue={section.config ?? ""}
                      rows={4}
                      placeholder='{"key": "value"}'
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={pending}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
