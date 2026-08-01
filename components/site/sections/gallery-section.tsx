import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { GalleryImage } from "@/lib/db/schema";

export function GallerySection({ images }: { images: GalleryImage[] }) {
  if (images.length === 0) return null;
  const displayImages = images.slice(0, 6);
  return (
    <section className="bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">Gallery</p>
            <h2 className="font-heading text-3xl font-semibold sm:text-4xl">Moments at Maiti Resort</h2>
          </div>
          <Link href="/gallery" className="group flex items-center gap-2 text-sm font-medium text-primary hover:underline">View all photos<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {displayImages.map((img, i) => (
            <Link key={img.id} href="/gallery" className={`group relative overflow-hidden rounded-xl ${i === 0 ? "col-span-2 row-span-2 md:col-span-1" : ""}`}>
              <Image src={img.src} alt={img.alt} width={800} height={600} className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 33vw" />
              <div className="absolute inset-0 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
