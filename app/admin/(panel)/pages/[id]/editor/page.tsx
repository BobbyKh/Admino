"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Loader2,
  Blocks,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { VideoPicker } from "@/components/admin/video-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription as ModalDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Page, PageBlock } from "@/lib/db/schema";
import {
  getPage,
  getPageBlocks,
  addPageBlock,
  updatePageBlock,
  deletePageBlock,
  reorderPageBlocks,
  generateBlockConfig,
} from "@/lib/actions/index";
import {
  BLOCK_TYPES,
  BLOCK_GROUP_LABELS,
  getBlockType,
  getDefaultConfig,
} from "@/lib/blocks";

function RepeaterConfigEditor({
  items,
  onChange,
}: {
  items: Record<string, unknown>[];
  onChange: (items: Record<string, unknown>[]) => void;
}) {
  const fields = [...new Set(items.flatMap((item) => Object.keys(item)))];
  const template = items[0] ?? { title: "New item" };

  function updateItem(index: number, key: string, value: unknown) {
    const nextItems = [...items];
    nextItems[index] = { ...nextItems[index], [key]: value };
    onChange(nextItems);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Items</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { ...template }])}>
          <Plus className="size-3.5" />Add item
        </Button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="space-y-3 rounded-lg border p-3">
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="icon-xs" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {fields.map((field) => {
              const value = item[field] ?? template[field] ?? "";
              const label = field.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
              if (typeof value === "boolean") {
                return <label key={field} className="flex items-center gap-2 pt-7 text-sm font-medium"><input type="checkbox" checked={value} onChange={(event) => updateItem(index, field, event.target.checked)} />{label}</label>;
              }
              if (Array.isArray(value)) {
                return <div key={field} className="space-y-1 md:col-span-2"><Label>{label}</Label><Input value={value.join(", ")} onChange={(event) => updateItem(index, field, event.target.value.split(",").map((entry) => entry.trim()).filter(Boolean))} placeholder="Separate values with commas" /></div>;
              }
              const isLongText = ["text", "description", "content", "answer", "bio"].includes(field);
              return <div key={field} className={`space-y-1 ${isLongText ? "md:col-span-2" : ""}`}><Label>{label}</Label>{isLongText ? <Textarea value={String(value)} onChange={(event) => updateItem(index, field, event.target.value)} rows={3} /> : <Input value={String(value)} onChange={(event) => updateItem(index, field, event.target.value)} />}</div>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Block Config Editor ─────────────────────────────────────────────────────

function BlockConfigEditor({
  block,
  onConfigChange,
}: {
  block: PageBlock;
  onConfigChange: (config: string) => void;
}) {
  // Block schemas vary; individual editors validate the values they expose.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type EditableBlockConfig = Record<string, any>;
  const blockType = getBlockType(block.type);
  let config: EditableBlockConfig = getDefaultConfig(block.type) as EditableBlockConfig;
  if (block.config) {
    try {
      config = JSON.parse(block.config) as EditableBlockConfig;
    } catch {
      config = getDefaultConfig(block.type) as EditableBlockConfig;
    }
  }

  const updateConfig = (key: string, value: unknown) => {
    const newConfig = { ...config, [key]: value };
    onConfigChange(JSON.stringify(newConfig));
  };

  if (!blockType) {
    return (
      <div className="space-y-2">
        <Label>Config (JSON)</Label>
        <Textarea
          value={block.config ?? ""}
          onChange={(e) => onConfigChange(e.target.value)}
          rows={6}
          className="font-mono text-xs"
        />
      </div>
    );
  }

  // Render specific editors based on block type
  switch (block.type) {
    case "hero":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={config.title ?? ""} onChange={(e) => updateConfig("title", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Subtitle</Label>
            <Input value={config.subtitle ?? ""} onChange={(e) => updateConfig("subtitle", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Badge</Label>
            <Input value={config.badge ?? ""} onChange={(e) => updateConfig("badge", e.target.value)} />
          </div>
          <ImageUploadField name={`hero-image-${block.id}`} label="Background image" value={config.image ?? ""} onChange={(url) => updateConfig("image", url)} />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Primary CTA Text</Label>
              <Input value={config.ctaPrimary ?? ""} onChange={(e) => updateConfig("ctaPrimary", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Primary CTA Link</Label>
              <Input value={config.ctaPrimaryLink ?? ""} onChange={(e) => updateConfig("ctaPrimaryLink", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Secondary CTA Text</Label>
              <Input value={config.ctaSecondary ?? ""} onChange={(e) => updateConfig("ctaSecondary", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Secondary CTA Link</Label>
              <Input value={config.ctaSecondaryLink ?? ""} onChange={(e) => updateConfig("ctaSecondaryLink", e.target.value)} />
            </div>
          </div>
        </div>
      );

    case "text":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Content (HTML)</Label>
            <Textarea
              value={config.content ?? ""}
              onChange={(e) => updateConfig("content", e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Alignment</Label>
              <select
                value={config.alignment ?? "left"}
                onChange={(e) => updateConfig("alignment", e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Max Width</Label>
              <Input value={config.maxWidth ?? "720px"} onChange={(e) => updateConfig("maxWidth", e.target.value)} />
            </div>
          </div>
        </div>
      );

    case "image":
      return (
        <div className="space-y-3">
          <ImageUploadField name={`image-${block.id}`} label="Image" value={config.src ?? ""} onChange={(url) => updateConfig("src", url)} />
          <div className="space-y-1">
            <Label>Alt Text</Label>
            <Input value={config.alt ?? ""} onChange={(e) => updateConfig("alt", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Caption</Label>
            <Input value={config.caption ?? ""} onChange={(e) => updateConfig("caption", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Width</Label>
              <Input value={config.width ?? "100%"} onChange={(e) => updateConfig("width", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Object Fit</Label>
              <select
                value={config.objectFit ?? "cover"}
                onChange={(e) => updateConfig("objectFit", e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="fill">Fill</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Link URL (optional)</Label>
            <Input value={config.link ?? ""} onChange={(e) => updateConfig("link", e.target.value)} />
          </div>
        </div>
      );

    case "video":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={config.title ?? ""} onChange={(e) => updateConfig("title", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={config.description ?? ""} onChange={(e) => updateConfig("description", e.target.value)} rows={3} />
          </div>
          <VideoPicker
            name={`video-${block.id}`}
            value={config.url ?? ""}
            posterName={`video-poster-${block.id}`}
            posterValue={config.poster ?? ""}
            label="Video"
            description="Upload a video or choose one from this tenant's Media Library."
            onChange={(url) => updateConfig("url", url)}
            onPosterChange={(url) => updateConfig("poster", url)}
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.autoplay ?? false}
                onChange={(e) => updateConfig("autoplay", e.target.checked)}
              />
              Autoplay
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.loop ?? false}
                onChange={(e) => updateConfig("loop", e.target.checked)}
              />
              Loop
            </label>
          </div>
        </div>
      );

    case "cta":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={config.title ?? ""} onChange={(e) => updateConfig("title", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Subtitle</Label>
            <Input value={config.subtitle ?? ""} onChange={(e) => updateConfig("subtitle", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Button Text</Label>
              <Input value={config.buttonText ?? ""} onChange={(e) => updateConfig("buttonText", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Button Link</Label>
              <Input value={config.buttonLink ?? ""} onChange={(e) => updateConfig("buttonLink", e.target.value)} />
            </div>
          </div>
          <ImageUploadField name={`cta-background-${block.id}`} label="Background image" value={config.backgroundImage ?? ""} onChange={(url) => updateConfig("backgroundImage", url)} />
        </div>
      );

    case "customHtml":
      return (
        <div className="space-y-1">
          <Label>HTML Content</Label>
          <Textarea
            value={config.html ?? ""}
            onChange={(e) => updateConfig("html", e.target.value)}
            rows={10}
            className="font-mono text-xs"
          />
        </div>
      );

    case "map":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Map Query / Address</Label>
            <Input value={config.query ?? ""} onChange={(e) => updateConfig("query", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Height</Label>
              <Input value={config.height ?? "400px"} onChange={(e) => updateConfig("height", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Zoom Level</Label>
              <Input
                type="number"
                value={config.zoom ?? 15}
                onChange={(e) => updateConfig("zoom", Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      );

    case "gallery":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label>Columns</Label>
              <select
                value={config.columns ?? 3}
                onChange={(e) => updateConfig("columns", Number(e.target.value))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Gap</Label>
              <Input value={config.gap ?? "16px"} onChange={(e) => updateConfig("gap", e.target.value)} />
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.showCaptions ?? true}
                onChange={(e) => updateConfig("showCaptions", e.target.checked)}
              />
              Captions
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.lightbox ?? true}
                onChange={(e) => updateConfig("lightbox", e.target.checked)}
              />
              Lightbox
            </label>
          </div>
        </div>
      );

    case "divider":
      return (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label>Style</Label>
            <select
              value={config.style ?? "solid"}
              onChange={(e) => updateConfig("style", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
              <option value="gradient">Gradient</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Color</Label>
            <Input value={config.color ?? "var(--border)"} onChange={(e) => updateConfig("color", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Spacing</Label>
            <Input value={config.spacing ?? "40px"} onChange={(e) => updateConfig("spacing", e.target.value)} />
          </div>
        </div>
      );

    case "spacer":
      return (
        <div className="space-y-1">
          <Label>Height</Label>
          <Input value={config.height ?? "80px"} onChange={(e) => updateConfig("height", e.target.value)} />
        </div>
      );

    case "features":
      {
        const items = Array.isArray(config.items) ? config.items : [];
        const updateItems = (nextItems: unknown[]) => updateConfig("items", nextItems);

      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={config.title ?? ""} onChange={(e) => updateConfig("title", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Subtitle</Label>
            <Input value={config.subtitle ?? ""} onChange={(e) => updateConfig("subtitle", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Columns</Label>
            <select
              value={config.columns ?? 3}
              onChange={(e) => updateConfig("columns", Number(e.target.value))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Feature cards</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateItems([...items, { icon: "star", title: "New feature", text: "Describe this feature." }])}
              >
                <Plus className="size-3.5" />
                Add feature
              </Button>
            </div>
            {items.map((item, index) => {
              const feature = typeof item === "object" && item !== null ? item as Record<string, unknown> : {};
              const updateFeature = (key: string, value: string) => {
                const nextItems = [...items];
                nextItems[index] = { ...feature, [key]: value };
                updateItems(nextItems);
              };
              return (
                <div key={index} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Feature {index + 1}</p>
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => updateItems(items.filter((_, itemIndex) => itemIndex !== index))}>
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <Input value={typeof feature.icon === "string" ? feature.icon : ""} onChange={(e) => updateFeature("icon", e.target.value)} placeholder="Icon" />
                    <Input value={typeof feature.title === "string" ? feature.title : ""} onChange={(e) => updateFeature("title", e.target.value)} placeholder="Feature title" />
                  </div>
                  <Textarea value={typeof feature.text === "string" ? feature.text : ""} onChange={(e) => updateFeature("text", e.target.value)} placeholder="Feature description" rows={2} />
                </div>
              );
            })}
          </div>
        </div>
      );
      }

    case "imageText":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label>Layout</Label><select value={config.layout ?? "left"} onChange={(e) => updateConfig("layout", e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="left">Image left</option><option value="right">Image right</option></select></div>
            <div className="space-y-1"><Label>Badge</Label><Input value={config.badge ?? ""} onChange={(e) => updateConfig("badge", e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label>Heading</Label><Input value={config.title ?? ""} onChange={(e) => updateConfig("title", e.target.value)} /></div>
          <div className="space-y-1"><Label>Text</Label><Textarea value={config.text ?? ""} onChange={(e) => updateConfig("text", e.target.value)} rows={4} /></div>
          <ImageUploadField name={`image-text-${block.id}`} label="Image" value={config.image ?? ""} onChange={(url) => updateConfig("image", url)} />
          <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>Button text</Label><Input value={config.buttonText ?? ""} onChange={(e) => updateConfig("buttonText", e.target.value)} /></div><div className="space-y-1"><Label>Button link</Label><Input value={config.buttonLink ?? ""} onChange={(e) => updateConfig("buttonLink", e.target.value)} /></div></div>
        </div>
      );

    case "richText":
      return (
        <div className="space-y-1">
          <Label>Formatted content</Label>
          <Textarea value={config.html ?? ""} onChange={(e) => updateConfig("html", e.target.value)} rows={10} placeholder="<h2>Your heading</h2><p>Your content...</p>" />
        </div>
      );

    case "faq":
      {
        const items = Array.isArray(config.items) ? config.items : [];
        const updateItems = (nextItems: unknown[]) => updateConfig("items", nextItems);
        return (
          <div className="space-y-3">
            <div className="space-y-1"><Label>Title</Label><Input value={config.title ?? ""} onChange={(e) => updateConfig("title", e.target.value)} /></div>
            <div className="flex items-center justify-between"><Label>Questions</Label><Button type="button" variant="outline" size="sm" onClick={() => updateItems([...items, { question: "New question", answer: "Answer" }])}><Plus className="size-3.5" />Add question</Button></div>
            {items.map((item, index) => {
              const faq = typeof item === "object" && item !== null ? item as Record<string, unknown> : {};
              const updateFaq = (key: string, value: string) => {
                const nextItems = [...items];
                nextItems[index] = { ...faq, [key]: value };
                updateItems(nextItems);
              };
              return <div key={index} className="space-y-2 rounded-lg border p-3"><div className="flex justify-end"><Button type="button" variant="ghost" size="icon-xs" onClick={() => updateItems(items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="size-3.5 text-destructive" /></Button></div><Input value={typeof faq.question === "string" ? faq.question : ""} onChange={(e) => updateFaq("question", e.target.value)} placeholder="Question" /><Textarea value={typeof faq.answer === "string" ? faq.answer : ""} onChange={(e) => updateFaq("answer", e.target.value)} placeholder="Answer" rows={3} /></div>;
            })}
          </div>
        );
      }

    case "search":
      return (
        <div className="space-y-3">
          <div className="space-y-1"><Label>Title</Label><Input value={config.title ?? ""} onChange={(e) => updateConfig("title", e.target.value)} /></div>
          <div className="space-y-1"><Label>Subtitle</Label><Input value={config.subtitle ?? ""} onChange={(e) => updateConfig("subtitle", e.target.value)} /></div>
          <div className="space-y-1"><Label>Search placeholder</Label><Input value={config.placeholder ?? ""} onChange={(e) => updateConfig("placeholder", e.target.value)} /></div>
        </div>
      );

    case "serviceGrid":
      return (
        <div className="space-y-3">
          <div className="space-y-1"><Label>Title</Label><Input value={config.title ?? ""} onChange={(e) => updateConfig("title", e.target.value)} /></div>
          <div className="space-y-1"><Label>Subtitle</Label><Input value={config.subtitle ?? ""} onChange={(e) => updateConfig("subtitle", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>Source</Label><select value={config.source ?? "latest"} onChange={(e) => updateConfig("source", e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option value="latest">Latest services</option><option value="featured">Featured services</option></select></div><div className="space-y-1"><Label>Maximum services</Label><Input value={config.limit ?? "6"} type="number" min="1" onChange={(e) => updateConfig("limit", e.target.value)} /></div></div>
        </div>
      );

    default:
      if (Array.isArray(config.items)) {
        const items = config.items.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
        return <RepeaterConfigEditor items={items} onChange={(nextItems) => updateConfig("items", nextItems)} />;
      }
      return (
        <div className="space-y-1">
          <Label>Config (JSON)</Label>
          <Textarea
            value={block.config ?? ""}
            onChange={(e) => onConfigChange(e.target.value)}
            rows={6}
            className="font-mono text-xs"
          />
        </div>
      );
  }
}

function AiBlockAssistant({
  block,
  onConfigChange,
}: {
  block: PageBlock;
  onConfigChange: (config: string) => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);

  async function generate() {
    setPending(true);
    setError(null);
    try {
      const result = await generateBlockConfig(block.id, instruction, block.config);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onConfigChange(result.config);
      setInstruction("");
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="size-3.5 text-primary" />
          AI Assist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" />Improve this block with AI</DialogTitle>
          <ModalDescription>
            Describe the result you want. AI updates this {getBlockType(block.type)?.label ?? block.type} block using its current content as context.
          </ModalDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            rows={4}
            placeholder="Make this more premium and concise for a boutique hotel"
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            {["Make it more premium", "Make it concise", "Improve SEO"].map((example) => (
              <Button key={example} type="button" variant="secondary" size="sm" onClick={() => setInstruction(example)}>{example}</Button>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="button" onClick={generate} disabled={pending || instruction.trim().length < 3} className="gap-2">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Generate and apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Editor Component ───────────────────────────────────────────────────

export default function BlockEditorPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = Number(params.id);

  const [page, setPage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [blockSearch, setBlockSearch] = useState("");
  const [, setPending] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const configSaveTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  // Load page and blocks
  useEffect(() => {
    async function load() {
      const [pageData, blocksData] = await Promise.all([
        getPage(pageId),
        getPageBlocks(pageId),
      ]);
      setPage(pageData);
      setBlocks(blocksData);
      setExpandedId(blocksData[0]?.id ?? null);
      setLoading(false);
    }
    load();
  }, [pageId]);

  const handleAddBlock = useCallback(
    async (type: string) => {
      const formData = new FormData();
      formData.set("pageId", String(pageId));
      formData.set("type", type);
      setPending(true);
      setSaveStatus("saving");
      setSaveError(null);
      try {
        const result = await addPageBlock({}, formData);
        if (!result.success) throw new Error(result.message || "Unable to add block.");
        const updated = await getPageBlocks(pageId);
        setBlocks(updated);
        setSaveStatus("saved");
      } catch (error) {
        setSaveStatus("error");
        setSaveError(error instanceof Error ? error.message : "Unable to add block.");
      } finally {
        setPending(false);
      }
    },
    [pageId]
  );

  const handleUpdateBlock = useCallback(
    async (blockId: number, updates: { title?: string; visible?: boolean; config?: string }) => {
      const formData = new FormData();
      formData.set("id", String(blockId));
      if (updates.title !== undefined) formData.set("title", updates.title);
      if (updates.visible !== undefined) formData.set("visible", updates.visible ? "on" : "");
      if (updates.config !== undefined) formData.set("config", updates.config);
      setPending(true);
      setSaveStatus("saving");
      setSaveError(null);
      try {
        const result = await updatePageBlock({}, formData);
        if (!result.success) throw new Error(result.message || "Unable to save block.");
        const updated = await getPageBlocks(pageId);
        setBlocks(updated);
        setSaveStatus("saved");
      } catch (error) {
        setSaveStatus("error");
        setSaveError(error instanceof Error ? error.message : "Unable to save block.");
      } finally {
        setPending(false);
      }
    },
    [pageId]
  );

  const handleConfigChange = useCallback((blockId: number, config: string) => {
    setBlocks((previous) => previous.map((block) => block.id === blockId ? { ...block, config } : block));
    setSaveStatus("saving");
    setSaveError(null);
    const existingTimer = configSaveTimers.current.get(blockId);
    if (existingTimer) clearTimeout(existingTimer);
    configSaveTimers.current.set(blockId, setTimeout(() => {
      configSaveTimers.current.delete(blockId);
      void handleUpdateBlock(blockId, { config });
    }, 600));
  }, [handleUpdateBlock]);

  useEffect(() => () => {
    configSaveTimers.current.forEach((timer) => clearTimeout(timer));
  }, []);

  const handleDeleteBlock = useCallback(
    async (blockId: number) => {
      setPending(true);
      setSaveStatus("saving");
      setSaveError(null);
      try {
        await deletePageBlock(blockId);
        setBlocks((prev) => prev.filter((b) => b.id !== blockId));
        if (expandedId === blockId) setExpandedId(null);
        setSaveStatus("saved");
      } catch (error) {
        setSaveStatus("error");
        setSaveError(error instanceof Error ? error.message : "Unable to delete block.");
      } finally {
        setPending(false);
      }
    },
    [expandedId]
  );

  const handleReorder = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      const newBlocks = [...blocks];
      const [moved] = newBlocks.splice(fromIndex, 1);
      newBlocks.splice(toIndex, 0, moved);
      setBlocks(newBlocks);
      const orderedIds = newBlocks.map((b) => b.id);
      setPending(true);
      setSaveStatus("saving");
      setSaveError(null);
      try {
        await reorderPageBlocks(orderedIds);
        setSaveStatus("saved");
      } catch (error) {
        setSaveStatus("error");
        setSaveError(error instanceof Error ? error.message : "Unable to reorder blocks.");
      } finally {
        setPending(false);
      }
    },
    [blocks]
  );

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const filteredBlockTypes = BLOCK_TYPES.filter((blockType) => {
    const query = blockSearch.trim().toLowerCase();
    return !query || `${blockType.label} ${blockType.description}`.toLowerCase().includes(query);
  });

  const handlePaletteDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("text/plain");
    if (dragIdx === null && getBlockType(type)) {
      handleAddBlock(type);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-medium">Page not found</p>
        <Button variant="ghost" onClick={() => router.push("/admin/pages")} className="mt-4">
          <ArrowLeft className="mr-2 size-4" />
          Back to Pages
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/pages")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{page.title}</h1>
            <p className="text-sm text-muted-foreground">
              Block editor · /{page.slug} · {blocks.length} blocks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${saveStatus === "error" ? "text-destructive" : "text-muted-foreground"}`}>
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? saveError ?? "Save failed" : "Autosave on"}
          </span>
          <Badge variant={page.published ? "default" : "secondary"}>
            {page.published ? "Published" : "Draft"}
          </Badge>
          {page.published && (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={page.slug === "home" ? "/" : `/${page.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" />
                Preview
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border bg-card p-4 lg:sticky lg:top-4">
          <div className="mb-4">
            <h2 className="font-semibold">Block palette</h2>
            <p className="text-xs text-muted-foreground">Click or drag a block onto the canvas.</p>
          </div>
          <Input
            value={blockSearch}
            onChange={(event) => setBlockSearch(event.target.value)}
            placeholder="Search blocks..."
            aria-label="Search blocks"
            className="mb-4"
          />
          <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
            {Object.entries(BLOCK_GROUP_LABELS).map(([group, label]) => {
              const blockTypes = filteredBlockTypes.filter((blockType) => blockType.group === group);
              if (blockTypes.length === 0) return null;
              return (
                <section key={group}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {label}
                  </p>
                  <div className="space-y-2">
                    {blockTypes.map((blockType) => {
                      const Icon = blockType.icon;
                      return (
                        <button
                          key={blockType.type}
                          type="button"
                          draggable
                          onClick={() => handleAddBlock(blockType.type)}
                          onDragStart={(event) => {
                            event.dataTransfer.setData("text/plain", blockType.type);
                            event.dataTransfer.effectAllowed = "copy";
                          }}
                          className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center rounded bg-primary/10">
                            <Icon className="size-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{blockType.label}</p>
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {blockType.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            {filteredBlockTypes.length === 0 && <p className="text-sm text-muted-foreground">No blocks found.</p>}
          </div>
        </aside>
        <section
          className="min-w-0"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handlePaletteDrop}
        >
      {blocks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Blocks className="mb-4 size-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">No blocks yet</p>
            <p className="text-sm text-muted-foreground">
              Choose a block from the palette or drag one here to start building this page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {blocks.map((block, index) => {
            const blockType = getBlockType(block.type);
            const Icon = blockType?.icon ?? Blocks;
            const isExpanded = expandedId === block.id;

            return (
              <Card
                key={block.id}
                className={`overflow-hidden transition-all ${
                  dragIdx === index ? "opacity-50" : ""
                }`}
              >
                {/* Block header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : block.id)}
                  draggable
                  onDragStart={() => setDragIdx(index)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.stopPropagation();
                    if (dragIdx !== null) {
                      handleReorder(dragIdx, index);
                      setDragIdx(null);
                    } else {
                      handlePaletteDrop(event);
                    }
                  }}
                  onDragEnd={() => setDragIdx(null)}
                >
                  <GripVertical className="size-4 shrink-0 text-muted-foreground/40" />
                  <div className="flex size-8 shrink-0 items-center justify-center rounded bg-primary/10">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {block.title || blockType?.label || block.type}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {block.type}
                      </Badge>
                      {!block.visible && (
                        <Badge variant="secondary" className="text-xs">
                          Hidden
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleUpdateBlock(block.id, { visible: !block.visible })
                      }
                      title={block.visible ? "Hide" : "Show"}
                    >
                      {block.visible ? (
                        <Eye className="size-4" />
                      ) : (
                        <EyeOff className="size-4 text-muted-foreground" />
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this block?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove this block from the page.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteBlock(block.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    {isExpanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Block config (expanded) */}
                {isExpanded && (
                  <CardContent className="border-t bg-muted/30 px-4 py-4">
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <AiBlockAssistant
                          block={block}
                          onConfigChange={(config) => handleConfigChange(block.id, config)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Block Title (optional)</Label>
                        <Input
                          value={block.title ?? ""}
                          onChange={(e) =>
                            handleUpdateBlock(block.id, { title: e.target.value })
                          }
                          placeholder={blockType?.label ?? block.type}
                        />
                      </div>
                      <BlockConfigEditor
                        block={block}
                        onConfigChange={(config) => handleConfigChange(block.id, config)}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
        </section>
      </div>
    </div>
  );
}
