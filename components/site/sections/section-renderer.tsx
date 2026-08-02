import type { GalleryImage, MenuItem } from "@/lib/db/schema";
import type { SiteSettings } from "@/lib/settings";
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

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function SectionRenderer({
  section,
  settings,
  galleryImages,
  featuredItems,
}: {
  section: { id: number; type: string; title?: string | null; sortOrder: number; visible: boolean; config?: string | null; createdAt?: string; siteId?: number | null };
  settings: SiteSettings;
  galleryImages: GalleryImage[];
  featuredItems: MenuItem[];
}) {
  const config = parseConfig(section.config ?? null);
  const cfg = section.config ?? null;

  switch (section.type) {
    // Homepage sections (use settings)
    case "hero":
      return <HeroSection settings={settings} />;
    case "features":
      return <FeaturesSection features={settings.features} title={config.title} subtitle={config.subtitle} />;
    case "about":
      return <AboutSection settings={settings} />;
    case "video":
      return <VideoSection settings={settings} />;
    case "gallery":
      return <GallerySection images={galleryImages} />;
    case "cta":
      return <CtaSection settings={settings} />;
    case "menuPreview":
      return <MenuPreviewSection items={featuredItems} />;
    case "banner":
      return <BannerSection config={config} />;
    case "customHtml":
      return <CustomHtmlSection config={config} />;

    // Page builder blocks (use config)
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
      return <ProductGridBlock config={cfg} />;
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
