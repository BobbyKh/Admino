"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "@/lib/db/schema";

export function GalleryFilter({
  categories,
  images,
}: {
  categories: string[];
  images: GalleryImage[];
}) {
  const [active, setActive] = React.useState("All");
  const filtered =
    active === "All" ? images : images.filter((i) => i.category === active);

  return (
    <>
      <div className="mb-10 flex flex-wrap justify-center gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActive(category)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              active === category
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((img, i) => (
          <figure
            key={img.id}
            className="group relative overflow-hidden rounded-xl border bg-muted"
          >
            <Image
              src={img.src}
              alt={img.alt}
              width={800}
              height={600}
              priority={i < 3}
              className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
              <p className="text-sm font-medium text-white">{img.title}</p>
              <p className="text-xs text-white/70">{img.category}</p>
            </figcaption>
          </figure>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-20 text-center text-muted-foreground">
          No photos in this category yet.
        </p>
      )}
    </>
  );
}
