import type { HomeSection, GalleryImage, MenuItem } from "@/lib/db/schema";
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
  section: HomeSection;
  settings: SiteSettings;
  galleryImages: GalleryImage[];
  featuredItems: MenuItem[];
}) {
  const config = parseConfig(section.config);

  switch (section.type) {
    case "hero":
      return <HeroSection settings={settings} />;
    case "features":
      return <FeaturesSection features={settings.features} />;
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
    default:
      return null;
  }
}
