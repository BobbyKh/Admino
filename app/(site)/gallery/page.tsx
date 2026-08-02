import type { Metadata } from "next";
import { getResolvedGallery, getResolvedSiteSettings } from "@/lib/data";
import { GalleryFilter } from "@/components/site/gallery-filter";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getResolvedSiteSettings();
  return {
    title: "Gallery",
    description: `Browse photos of ${settings.siteName} — our dining spaces, outdoor seating, food and events.`,
    openGraph: {
      title: `Gallery | ${settings.siteName}`,
      description: `A glimpse of ${settings.siteName} — scenic outdoor seating, delicious food and unforgettable moments.`,
      type: "website",
    },
  };
}

export default async function GalleryPage() {
  const [gallery, settings] = await Promise.all([getResolvedGallery(), getResolvedSiteSettings()]);
  const categories = ["All", ...Array.from(new Set(gallery.map((g) => g.category)))];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-12 text-center">
        <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">
          {settings.siteName}
        </p>
        <h1 className="font-heading text-4xl font-semibold sm:text-5xl">
          Our Gallery
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          A glimpse of the resort — scenic outdoor seating, delicious food and
          unforgettable moments in Kirtipur.
        </p>
      </div>

      <GalleryFilter categories={categories} images={gallery} />
    </div>
  );
}
