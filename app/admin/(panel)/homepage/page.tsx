"use client";

import * as React from "react";
import {
  GripVertical,
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
} from "@/lib/actions/index";
import type { HomeSection } from "@/lib/db/schema";

const SECTION_GROUPS = [
  {
    label: "Content Sections",
    items: [
      { value: "hero", label: "Hero Banner", description: "Main hero section with background image", icon: "🖼️" },
      { value: "about", label: "About Section", description: "About us with image and text", icon: "ℹ️" },
      { value: "features", label: "Features Grid", description: "Feature cards with icons", icon: "✨" },
      { value: "video", label: "Video Section", description: "Embedded video player (YouTube/Vimeo)", icon: "🎬" },
    ],
  },
  {
    label: "Commerce Sections",
    items: [
      { value: "menuPreview", label: "Menu Preview", description: "Featured menu items grid", icon: "🍽️" },
      { value: "gallery", label: "Gallery Preview", description: "Gallery image grid", icon: "📷" },
    ],
  },
  {
    label: "Call-to-Action",
    items: [
      { value: "cta", label: "CTA Banner", description: "Call-to-action with buttons", icon: "🎯" },
      { value: "banner", label: "Image Banner", description: "Full-width image with optional text overlay", icon: "🏞️" },
    ],
  },
  {
    label: "Advanced",
    items: [
      { value: "customHtml", label: "Custom HTML", description: "Embed any custom content or code", icon: "💻" },
    ],
  },
];

const SECTION_TYPES = SECTION_GROUPS.flatMap((g) => g.items);

function getTypeLabel(type: string) {
  return SECTION_TYPES.find((t) => t.value === type)?.label ?? type;
}

function getTypeIcon(type: string) {
  return SECTION_TYPES.find((t) => t.value === type)?.icon ?? "📄";
}

export default function HomepageSectionsPage() {
  const [sections, setSections] = React.useState<HomeSection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pending, startTransition] = React.useTransition();
  const [showAdd, setShowAdd] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [dragIdx, setDragIdx] = React.useState<number | null>(null);
  const [overIdx, setOverIdx] = React.useState<number | null>(null);

  React.useEffect(() => {
    getHomeSections()
      .then(setSections)
      .finally(() => setLoading(false));
  }, []);

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    const updated = [...sections];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setSections(updated);
    setDragIdx(null);
    setOverIdx(null);
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
                  {SECTION_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.items.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.icon} {t.label} — {t.description}
                        </option>
                      ))}
                    </optgroup>
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
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(i));
                setDragIdx(i);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOverIdx(i);
              }}
              onDragLeave={() => setOverIdx(null)}
              onDrop={(e) => {
                e.preventDefault();
                const from = Number(e.dataTransfer.getData("text/plain"));
                reorder(from, i);
              }}
              onDragEnd={() => {
                setDragIdx(null);
                setOverIdx(null);
              }}
              className={`rounded-lg border p-3 transition-all ${
                dragIdx === i
                  ? "opacity-40 scale-95"
                  : overIdx === i && dragIdx !== null
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="cursor-grab text-muted-foreground/50 active:cursor-grabbing hover:text-muted-foreground"
                  title="Drag to reorder"
                >
                  <GripVertical className="size-4" />
                </span>

                <span className="text-lg leading-none">{getTypeIcon(section.type)}</span>

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
