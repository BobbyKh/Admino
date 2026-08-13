"use client";

import * as React from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

function parseConfig(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

interface GalleryItem {
  src: string;
  alt?: string;
  caption?: string;
}

function parseItems(raw: unknown): GalleryItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((item): item is GalleryItem => typeof item === "object" && item !== null && typeof (item as GalleryItem).src === "string" && Boolean((item as GalleryItem).src));
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function GalleryLightboxBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const items = parseItems(c.items);
  const [selected, setSelected] = React.useState<number | null>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (selected === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelected(null);
      } else if (selected !== null && e.key === "ArrowLeft" && selected > 0) {
        setSelected(selected - 1);
      } else if (selected !== null && e.key === "ArrowRight" && selected < items.length - 1) {
        setSelected(selected + 1);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selected, items.length]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        {typeof c.badge === "string" && c.badge && <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">{c.badge}</p>}
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
          {typeof c.title === "string" && c.title || "Gallery"}
        </h2>
      </div>
      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className="group relative aspect-square overflow-hidden rounded-xl"
              aria-label={`View ${item.alt || item.caption || `image ${i + 1}`}`}
            >
              <Image
                src={item.src}
                alt={item.alt || item.caption || ""}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          No images configured. Add items as JSON in the block config.
        </p>
      )}

      {selected !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelected(null)}
        >
          <button
            ref={closeButtonRef}
            onClick={() => setSelected(null)}
            className="absolute right-4 top-4 text-white/80 hover:text-white"
            aria-label="Close lightbox"
          >
            <X className="size-8" />
          </button>

          {selected > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setSelected(selected - 1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="size-10" />
            </button>
          )}

          {selected < items.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setSelected(selected + 1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
              aria-label="Next image"
            >
              <ChevronRight className="size-10" />
            </button>
          )}

          <div className="relative max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={items[selected].src}
              alt={items[selected].alt || items[selected].caption || ""}
              width={1200}
              height={800}
              className="max-h-[85vh] rounded-lg object-contain"
            />
            {items[selected].caption && (
              <p className="mt-3 text-center text-sm text-white/80">
                {items[selected].caption}
              </p>
            )}
            <p className="mt-1 text-center text-xs text-white/50">
              {selected + 1} / {items.length}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
