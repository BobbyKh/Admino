import type { GalleryImage, MenuItem, Product, Service, ServiceCategory } from "@/lib/db/schema";
import Image from "next/image";
import type { Feature, SiteSettings } from "@/lib/settings";
import { HeroSection } from "./hero-section";
import { FeaturesSection } from "./features-section";
import { AboutSection } from "./about-section";
import { VideoSection } from "./video-section";
import { GallerySection } from "./gallery-section";
import { CtaSection } from "./cta-section";
import { MenuPreviewSection } from "./menu-preview-section";
import { BannerSection } from "./banner-section";
import { CustomHtmlSection } from "./custom-html-section";
import { AuthFormBlock } from "../blocks/auth-form-block";
import { ContactFormBlock } from "../blocks/contact-form-block";
import { FaqBlock } from "../blocks/faq-block";
import { TestimonialBlock } from "../blocks/testimonial-block";
import { PricingBlock } from "../blocks/pricing-block";
import { ProductGridBlock } from "../blocks/product-grid-block";
import { TeamBlock } from "../blocks/team-block";
import { StatsBlock } from "../blocks/stats-block";
import { NewsletterBlock } from "../blocks/newsletter-block";
import { TimelineBlock } from "../blocks/timeline-block";
import { SpacerBlock } from "../blocks/spacer-block";
import { DividerBlock } from "../blocks/divider-block";
import { ImageTextBlock } from "../blocks/image-text-block";
import { RichTextBlock } from "../blocks/rich-text-block";
import { SliderBlock } from "../blocks/slider-block";
import { TabsBlock } from "../blocks/tabs-block";
import { CtaBannerBlock } from "../blocks/cta-banner-block";
import { MapBlock } from "../blocks/map-block";
import { ServicesBlock } from "../blocks/services-block";
import { AlertBlock } from "../blocks/alert-block";
import { GalleryLightboxBlock } from "../blocks/gallery-lightbox-block";
import { StepsBlock } from "../blocks/steps-block";
import { InfoCardBlock } from "../blocks/info-card-block";
import { SearchBlock } from "../blocks/search-block";
import { ServiceGridBlock } from "../blocks/service-grid-block";

function parseConfig(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function getString(config: Record<string, unknown>, key: string): string | undefined {
  const value = config[key];
  return typeof value === "string" ? value : undefined;
}

function getStringConfig(config: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(config).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function getFeatures(config: Record<string, unknown>, fallback: Feature[]): Feature[] {
  const items = config.items;
  if (!Array.isArray(items)) return fallback;
  return items.filter(
    (item): item is Feature =>
      typeof item === "object" &&
      item !== null &&
      typeof item.title === "string" &&
      typeof item.text === "string" &&
      typeof item.icon === "string"
  );
}

export function SectionRenderer({
  section,
  settings,
  galleryImages,
  featuredItems,
  products,
  serviceCategories = [],
  services = [],
}: {
  section: { id: number; type: string; title?: string | null; sortOrder: number; visible: boolean; config?: string | null; createdAt?: string; siteId?: number | null };
  settings: SiteSettings;
  galleryImages: GalleryImage[];
  featuredItems: MenuItem[];
  products: Product[];
  serviceCategories?: ServiceCategory[];
  services?: Service[];
}) {
  const config = parseConfig(section.config ?? null);
  const cfg = section.config ?? null;
  const isHomepageSection = section.siteId !== undefined;

  switch (section.type) {
    // Homepage sections (use settings)
    case "hero":
      return (
        <HeroSection
          settings={{
            ...settings,
            heroTitle: getString(config, "title") ?? settings.heroTitle,
            heroSubtitle: getString(config, "subtitle") ?? settings.heroSubtitle,
            heroBadge: getString(config, "badge") ?? settings.heroBadge,
            heroImage: getString(config, "image") ?? settings.heroImage,
            heroCtaPrimary: getString(config, "ctaPrimary") ?? settings.heroCtaPrimary,
            heroCtaPrimaryLink: getString(config, "ctaPrimaryLink") ?? settings.heroCtaPrimaryLink,
            heroCtaSecondary: getString(config, "ctaSecondary") ?? settings.heroCtaSecondary,
            heroCtaSecondaryLink: getString(config, "ctaSecondaryLink") ?? settings.heroCtaSecondaryLink,
          }}
        />
      );
    case "features":
      if (isHomepageSection && settings.showFeatures !== "true") return null;
      return (
        <FeaturesSection
          features={getFeatures(config, settings.features)}
          title={getString(config, "title")}
          subtitle={getString(config, "subtitle")}
        />
      );
    case "about":
      if (isHomepageSection && settings.showAbout !== "true") return null;
      return <AboutSection settings={settings} />;
    case "video":
      if (isHomepageSection && settings.showVideo !== "true") return null;
      return (
        <VideoSection
          settings={{
            ...settings,
            videoUrl: getString(config, "url") ?? settings.videoUrl,
            videoTitle: getString(config, "title") ?? settings.videoTitle,
            videoDescription: getString(config, "description") ?? settings.videoDescription,
            videoPoster: getString(config, "poster") ?? settings.videoPoster,
          }}
        />
      );
    case "gallery":
      if (isHomepageSection && settings.showGallery !== "true") return null;
      return <GallerySection images={galleryImages} />;
    case "cta":
      if (isHomepageSection && settings.showCta !== "true") return null;
      return <CtaSection settings={{ ...settings, heroImage: getString(config, "backgroundImage") ?? settings.heroImage }} />;
    case "menuPreview":
      return <MenuPreviewSection items={featuredItems} />;
    case "banner":
      return <BannerSection config={getStringConfig(config)} />;
    case "customHtml":
      return <CustomHtmlSection config={getStringConfig(config)} />;

    // Page builder blocks (use config)
    case "text":
      return <RichTextBlock config={cfg} />;
    case "image": {
      const src = getString(config, "src");
      if (!src) return null;
      return (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <figure className="overflow-hidden rounded-xl">
            <Image src={src} alt={getString(config, "alt") ?? ""} width={1400} height={900} unoptimized className="h-auto w-full object-cover" />
            {getString(config, "caption") && <figcaption className="mt-3 text-center text-sm text-muted-foreground">{getString(config, "caption")}</figcaption>}
          </figure>
        </section>
      );
    }
    case "columns": {
      const columns = Array.isArray(config.columns) ? config.columns : [];
      return (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2">
            {(columns.length ? columns : [{}, {}]).map((column, index) => {
              const content = typeof column === "object" && column && "content" in column && typeof column.content === "string" ? column.content : "";
              return <div key={index} className="rounded-xl border bg-card p-6"><RichTextBlock compact config={JSON.stringify({ html: content || "<p>Add column content.</p>" })} /></div>;
            })}
          </div>
        </section>
      );
    }
    case "authForm":
      return <AuthFormBlock config={cfg} />;
    case "contactForm":
      return <ContactFormBlock config={cfg} />;
    case "faq":
      return <FaqBlock config={cfg} />;
    case "testimonial":
      return <TestimonialBlock config={cfg} />;
    case "pricing":
      return <PricingBlock config={cfg} />;
    case "productGrid":
      return <ProductGridBlock config={cfg} products={products} />;
    case "search":
      return <SearchBlock config={cfg} products={products} />;
    case "team":
      return <TeamBlock config={cfg} />;
    case "stats":
      return <StatsBlock config={cfg} />;
    case "newsletter":
      return <NewsletterBlock config={cfg} />;
    case "timeline":
      return <TimelineBlock config={cfg} />;
    case "spacer":
      return <SpacerBlock config={cfg} />;
    case "divider":
      return <DividerBlock config={cfg} />;
    case "imageText":
      return <ImageTextBlock config={cfg} />;
    case "richText":
      return <RichTextBlock config={cfg} />;
    case "slider":
      return <SliderBlock config={cfg} />;
    case "tabs":
      return <TabsBlock config={cfg} />;
    case "ctaBanner":
      return <CtaBannerBlock config={cfg} />;
    case "map":
      return <MapBlock config={cfg} />;
    case "services":
      return <ServicesBlock config={cfg} />;
    case "serviceGrid":
      return <ServiceGridBlock config={cfg} categories={serviceCategories} services={services} />;
    case "alert":
      return <AlertBlock config={cfg} />;
    case "galleryLightbox":
      return <GalleryLightboxBlock config={cfg} />;
    case "steps":
      return <StepsBlock config={cfg} />;
    case "infoCard":
      return <InfoCardBlock config={cfg} />;

    default:
      return null;
  }
}
