"use client";

import * as React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

interface GalleryItem {
  src: string;
  alt?: string;
  caption?: string;
}

function parseItems(raw: string | null): GalleryItem[] {
  if (!raw) return [];
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

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        {c.badge && <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">{c.badge}</p>}
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
          {c.title || "Gallery"}
        </h2>
      </div>
      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className="group relative aspect-square overflow-hidden rounded-xl"
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
          className="fixed inset- z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelected(null)}
        >
          <button
            onClick={() => setSelected(null)}
            className="absolute right-4 top-4 text-white/80 hover:text-white"
          >
            <X className="size-8" />
          </button>
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
          </div>
        </div>
      )}
    </section>
  );
}
