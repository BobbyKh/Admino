import { db } from "../lib/db/client";
import { sites, settings, homeSections, navLinks } from "../lib/db/schema-postgres";
import { eq } from "drizzle-orm";

const DEFAULT_SITE_SETTINGS: Record<string, string> = {
  siteName: "My Website",
  tagline: "Welcome",
  heroTitle: "Welcome to Our Website",
  heroSubtitle: "We're glad you're here. Explore what we have to offer.",
  heroBadge: "",
  heroCtaPrimary: "Get Started",
  heroCtaSecondary: "Learn More",
  heroCtaPrimaryLink: "/contact",
  heroCtaSecondaryLink: "/gallery",
  heroImage: "",
  logo: "",
  description: "",
  address: "",
  phone: "",
  email: "",
  hours: "",
  priceRange: "",
  rating: "",
  reviewCount: "",
  aboutTitle: "About Us",
  aboutText: "Tell your story here.",
  aboutImage: "",
  footerNote: "",
  mapQuery: "",
  showFeatures: "true",
  showAbout: "true",
  showVideo: "false",
  showGallery: "true",
  showCta: "true",
  features: "[]",
  services: "[]",
  videoUrl: "",
  videoTitle: "",
  videoDescription: "",
  videoPoster: "",
  cloudinaryCloudName: "",
  cloudinaryApiKey: "",
  cloudinaryApiSecret: "",
  smtpHost: "",
  smtpPort: "",
  smtpSecure: "false",
  smtpUser: "",
  smtpPass: "",
  smtpFrom: "",
  adminNotifyEmail: "",
  aiChatEnabled: "false",
  aiProvider: "openai",
  aiBaseUrl: "",
  aiApiKey: "",
  aiModel: "",
  aiSystemPrompt: "",
  themePrimary: "",
  themePrimaryForeground: "",
  themeSecondary: "",
  themeSecondaryForeground: "",
  themeAccent: "",
  themeAccentForeground: "",
  themeBackground: "",
  themeForeground: "",
  themeMuted: "",
  themeMutedForeground: "",
  themeBorder: "",
  themeRing: "",
  themeDestructive: "",
  themeCard: "",
  themeCardForeground: "",
};

const DEFAULT_SECTIONS = [
  { type: "hero", sortOrder: 0 },
  { type: "features", sortOrder: 1 },
  { type: "about", sortOrder: 2 },
  { type: "gallery", sortOrder: 3 },
  { type: "cta", sortOrder: 4 },
];

async function main() {
  const allSites = await db.select().from(sites);

  for (const site of allSites) {
    // Check if settings exist
    const existingSettings = await db.select().from(settings).where(eq(settings.siteId, site.id));
    if (existingSettings.length === 0) {
      console.log(`Seeding settings for site ${site.id} (${site.slug})...`);
      for (const [key, value] of Object.entries(DEFAULT_SITE_SETTINGS)) {
        await db.insert(settings).values({ key, value, siteId: site.id });
      }
    } else {
      console.log(`Site ${site.id} (${site.slug}) already has ${existingSettings.length} settings`);
    }

    // Check if home sections exist
    const existingSections = await db.select().from(homeSections).where(eq(homeSections.siteId, site.id));
    if (existingSections.length === 0) {
      console.log(`Seeding home sections for site ${site.id} (${site.slug})...`);
      for (const s of DEFAULT_SECTIONS) {
        await db.insert(homeSections).values({
          type: s.type,
          sortOrder: s.sortOrder,
          visible: true,
          siteId: site.id,
        });
      }
    } else {
      console.log(`Site ${site.id} (${site.slug}) already has ${existingSections.length} sections`);
    }

    // Check if nav links exist
    const existingNavs = await db.select().from(navLinks).where(eq(navLinks.siteId, site.id));
    if (existingNavs.length === 0) {
      console.log(`Seeding nav links for site ${site.id} (${site.slug})...`);
      const links = [
        { label: "Home", href: "/", sortOrder: 0 },
        { label: "Gallery", href: "/gallery", sortOrder: 1 },
        { label: "Contact", href: "/contact", sortOrder: 2 },
      ];
      for (const l of links) {
        await db.insert(navLinks).values({
          ...l,
          visible: true,
          external: false,
          siteId: site.id,
        });
      }
    } else {
      console.log(`Site ${site.id} (${site.slug}) already has ${existingNavs.length} nav links`);
    }
  }

  console.log("Done!");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
