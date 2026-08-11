"use client";

import * as React from "react";
import {
  GripVertical,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

function SortableSectionItem({
  section,
  isEditing,
  onToggleEdit,
  onToggleVisibility,
  onDelete,
  onSave,
  onCancelEdit,
  pending,
}: {
  section: HomeSection;
  isEditing: boolean;
  onToggleEdit: () => void;
  onToggleVisibility: (id: number, visible: boolean) => void;
  onDelete: (id: number) => void;
  onSave: (id: number, e: React.FormEvent<HTMLFormElement>) => void;
  onCancelEdit: () => void;
  pending: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : "auto" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border p-3 transition-all ${
        isDragging ? "shadow-lg ring-2 ring-primary/30" : "hover:bg-muted/50"
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${getTypeLabel(section.type)}`}
        >
          <GripVertical className="size-4" />
        </button>

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
          onCheckedChange={(val) => onToggleVisibility(section.id, val)}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleEdit}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(section.id)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {isEditing && (
        <form
          onSubmit={(e) => onSave(section.id, e)}
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
              onClick={onCancelEdit}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function DragOverlaySectionContent({ section }: { section: HomeSection }) {
  return (
    <Card className="shadow-xl ring-2 ring-primary/40 opacity-90 w-full max-w-[600px]">
      <div className="flex items-center gap-2 p-3 bg-background">
        <GripVertical className="size-4 text-primary" />
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
      </div>
    </Card>
  );
}

export default function HomepageSectionsPage() {
  const [sections, setSections] = React.useState<HomeSection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pending, startTransition] = React.useTransition();
  const [showAdd, setShowAdd] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [activeDragId, setActiveDragId] = React.useState<number | string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  React.useEffect(() => {
    getHomeSections()
      .then(setSections)
      .finally(() => setLoading(false));
  }, []);

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const updated = arrayMove(sections, oldIndex, newIndex);
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

  const activeDragSection = activeDragId
    ? sections.find((s) => s.id === activeDragId)
    : null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl border bg-muted/30" />)}
        </div>
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {sections.map((section) => (
                <SortableSectionItem
                  key={section.id}
                  section={section}
                  isEditing={editingId === section.id}
                  onToggleEdit={() => setEditingId(editingId === section.id ? null : section.id)}
                  onToggleVisibility={handleToggleVisibility}
                  onDelete={handleDelete}
                  onSave={handleUpdate}
                  onCancelEdit={() => setEditingId(null)}
                  pending={pending}
                />
              ))}
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeDragSection ? <DragOverlaySectionContent section={activeDragSection} /> : null}
            </DragOverlay>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
}
