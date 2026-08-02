import type { Metadata } from "next";
import {
  getResolvedFeaturedItems,
  getResolvedGallery,
  getResolvedHomeSections,
  getResolvedSiteSettings,
} from "@/lib/data";
import { SectionRenderer } from "@/components/site/sections/section-renderer";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Maiti Resort — Dining & Relaxation in Kirtipur, Nepal",
  description:
    "A peaceful, scenic dining getaway just 5 km from Balkhu. Open daily 10 AM–10 PM. Breakfast, lunch, dinner, dessert, coffee, beer & wine. ★ 4.2 rated resort in Kirtipur 44600, Nepal.",
};

export default async function HomePage() {
  const [settings, gallery, featured, sections] = await Promise.all([
    getResolvedSiteSettings(),
    getResolvedGallery(),
    getResolvedFeaturedItems(),
    getResolvedHomeSections(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: settings.siteName,
    image: settings.heroImage,
    telephone: settings.phone,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Kirtipur",
      postalCode: "44600",
      addressCountry: "NP",
    },
    priceRange: settings.priceRange,
    servesCuisine: ["Fast Food", "Nepali", "Continental"],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: settings.rating,
      reviewCount: settings.reviewCount,
    },
    openingHours: "Mo-Su 10:00-22:00",
    url: process.env.SITE_URL ?? "http://localhost:3000",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          settings={settings}
          galleryImages={gallery}
          featuredItems={featured}
        />
      ))}

      {/* Fallback: if no sections configured, show default layout */}
      {sections.length === 0 && (
        <>
          <SectionRenderer
            section={{ id: 0, type: "hero", title: null, sortOrder: 0, visible: true, config: null, createdAt: "", siteId: null }}
            settings={settings}
            galleryImages={gallery}
            featuredItems={featured}
          />
          <SectionRenderer
            section={{ id: 0, type: "features", title: null, sortOrder: 1, visible: true, config: null, createdAt: "", siteId: null }}
            settings={settings}
            galleryImages={gallery}
            featuredItems={featured}
          />
          <SectionRenderer
            section={{ id: 0, type: "about", title: null, sortOrder: 2, visible: true, config: null, createdAt: "", siteId: null }}
            settings={settings}
            galleryImages={gallery}
            featuredItems={featured}
          />
          <SectionRenderer
            section={{ id: 0, type: "video", title: null, sortOrder: 3, visible: true, config: null, createdAt: "", siteId: null }}
            settings={settings}
            galleryImages={gallery}
            featuredItems={featured}
          />
          <SectionRenderer
            section={{ id: 0, type: "menuPreview", title: null, sortOrder: 4, visible: true, config: null, createdAt: "", siteId: null }}
            settings={settings}
            galleryImages={gallery}
            featuredItems={featured}
          />
          <SectionRenderer
            section={{ id: 0, type: "gallery", title: null, sortOrder: 5, visible: true, config: null, createdAt: "", siteId: null }}
            settings={settings}
            galleryImages={gallery}
            featuredItems={featured}
          />
          <SectionRenderer
            section={{ id: 0, type: "cta", title: null, sortOrder: 6, visible: true, config: null, createdAt: "", siteId: null }}
            settings={settings}
            galleryImages={gallery}
            featuredItems={featured}
          />
        </>
      )}
    </>
  );
}
