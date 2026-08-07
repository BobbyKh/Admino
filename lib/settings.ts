/**
 * CMS site settings — key/value store with typed defaults.
 * Admin panel edits these through /admin/settings.
 */
export const SETTING_KEYS = [
  "siteName",
  "tagline",
  "logo",
  "favicon",
  "description",
  // Hero
  "heroTitle",
  "heroSubtitle",
  "heroImage",
  "heroBadge",
  "heroCtaPrimary",
  "heroCtaSecondary",
  "heroCtaPrimaryLink",
  "heroCtaSecondaryLink",
  // Homepage section toggles
  "showFeatures",
  "showAbout",
  "showVideo",
  "showGallery",
  "showCta",
  // Video section
  "videoUrl",
  "videoTitle",
  "videoDescription",
  "videoPoster",
  // About
  "aboutTitle",
  "aboutText",
  "aboutImage",
  // Contact
  "address",
  "phone",
  "email",
  "mapQuery",
  "hours",
  "priceRange",
  "rating",
  "reviewCount",
  // Homepage content
  "features",
  "services",
  "footerNote",
  // Header and footer presentation
  "navbarCtaLabel",
  "navbarCtaLink",
  "navbarShowPhone",
  "footerExploreTitle",
  "footerContactTitle",
  "footerHoursTitle",
  "footerCopyright",
  // Theme colors
  "themePrimary",
  "themePrimaryForeground",
  "themeSecondary",
  "themeSecondaryForeground",
  "themeAccent",
  "themeAccentForeground",
  "themeBackground",
  "themeForeground",
  "themeMuted",
  "themeMutedForeground",
  "themeBorder",
  "themeRing",
  "themeDestructive",
  "themeCard",
  "themeCardForeground",
  // Cloudinary
  "cloudinaryCloudName",
  "cloudinaryApiKey",
  "cloudinaryApiSecret",
  // SMTP
  "smtpHost",
  "smtpPort",
  "smtpSecure",
  "smtpUser",
  "smtpPass",
  "smtpFrom",
  "adminNotifyEmail",
  // AI
  "aiProvider",
  "aiApiKey",
  "aiModel",
  "aiBaseUrl",
  "aiSystemPrompt",
  "aiChatEnabled",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

/**
 * Credential/sensitive keys that must NEVER be exposed to public pages.
 * Kept next to SETTING_KEYS so new secret keys can't be forgotten here.
 */
export const SECRET_SETTING_KEYS = new Set<SettingKey>([
  "cloudinaryCloudName",
  "cloudinaryApiKey",
  "cloudinaryApiSecret",
  "smtpHost",
  "smtpPort",
  "smtpSecure",
  "smtpUser",
  "smtpPass",
  "smtpFrom",
  "adminNotifyEmail",
  "aiApiKey",
]);

export const DEFAULT_SETTINGS: Record<SettingKey, string> = {
  siteName: "Maiti Resort",
  tagline: "A peaceful dining & relaxation getaway in Kirtipur",
  logo: "",
  favicon: "",
  description:
    "Maiti Resort is a dining and relaxation venue located in Kirtipur 44600, Nepal. Set within 5 km of Balkhu, it offers a peaceful, scenic getaway away from city traffic and noise, featuring a spacious layout with outdoor seating and a romantic, casual atmosphere suitable for groups and families with children. The resort serves breakfast, lunch, dinner, dessert, coffee, beer, and wine, with options for dine-in, takeout, and curbside pickup, and provides amenities such as restrooms, wheelchair-accessible facilities, NFC payment acceptance, and free lot and street parking.",
  heroTitle: "Dine, Relax & Unwind in Kirtipur",
  heroSubtitle:
    "A scenic dining and relaxation venue just 5 km from Balkhu — away from city noise, surrounded by greenery, open daily from 10:00 AM to 10:00 PM.",
  heroImage:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80",
  heroBadge: "Open daily · 10:00 AM – 10:00 PM",
  heroCtaPrimary: "Reserve a Table",
  heroCtaSecondary: "View Menu",
  heroCtaPrimaryLink: "/book",
  heroCtaSecondaryLink: "/menu",
  // Homepage section toggles (all visible by default)
  showFeatures: "true",
  showAbout: "true",
  showVideo: "false",
  showGallery: "true",
  showCta: "true",
  // Video section
  videoUrl: "",
  videoTitle: "Experience Maiti Resort",
  videoDescription: "Take a virtual tour of our resort and see what makes us special.",
  videoPoster: "",
  // About
  aboutTitle: "A Peaceful, Scenic Getaway",
  aboutText:
    "Set within 5 km of Balkhu, Maiti Resort offers a spacious layout with outdoor seating and a romantic, casual atmosphere — perfect for groups, families with children, and quiet escapes. We serve breakfast, lunch, dinner, dessert, coffee, beer, and wine, with dine-in, takeout, and curbside pickup options. Enjoy free lot and street parking, wheelchair-accessible facilities, NFC payments, and clean restrooms throughout your visit.",
  aboutImage:
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
  address: "Kirtipur 44600, Nepal",
  phone: "+977 974-6510970",
  email: "hello@maitiresort.com",
  mapQuery: "Kirtipur 44600, Nepal",
  hours: "Open daily · 10:00 AM – 10:00 PM",
  priceRange: "NPR 500 – NPR 1,000",
  rating: "4.2",
  reviewCount: "120+",
  features: JSON.stringify([
    { title: "Scenic Location", text: "Peaceful getaway 5 km from Balkhu, away from city traffic and noise.", icon: "leaf" },
    { title: "Outdoor Seating", text: "Spacious layout with al-fresco seating and a romantic, casual atmosphere.", icon: "sun" },
    { title: "Family Friendly", text: "A welcoming spot for groups and families with children.", icon: "users" },
    { title: "Convenient Amenities", text: "Free parking, wheelchair access, NFC payments, and restrooms.", icon: "parking" },
  ]),
  services: JSON.stringify([
    "Dine-in",
    "Takeout",
    "Curbside pickup",
    "Breakfast · Lunch · Dinner",
    "Dessert · Coffee",
    "Beer & Wine",
    "Outdoor seating",
    "Free lot & street parking",
    "Wheelchair accessible",
    "NFC payments",
    "Restrooms",
  ]),
  footerNote:
    "Maiti Resort — a dining and relaxation venue in Kirtipur, Nepal. Open daily 10:00 AM – 10:00 PM.",
  navbarCtaLabel: "Contact Us",
  navbarCtaLink: "/contact",
  navbarShowPhone: "true",
  footerExploreTitle: "Explore",
  footerContactTitle: "Visit Us",
  footerHoursTitle: "Hours",
  footerCopyright: "",
  // Theme colors
  themePrimary: "oklch(0.5 0.11 155)",
  themePrimaryForeground: "oklch(0.985 0 0)",
  themeSecondary: "oklch(0.945 0.02 140)",
  themeSecondaryForeground: "oklch(0.3 0.05 150)",
  themeAccent: "oklch(0.93 0.03 90)",
  themeAccentForeground: "oklch(0.3 0.06 90)",
  themeBackground: "oklch(0.985 0.005 120)",
  themeForeground: "oklch(0.16 0.02 145)",
  themeMuted: "oklch(0.955 0.01 140)",
  themeMutedForeground: "oklch(0.5 0.02 145)",
  themeBorder: "oklch(0.9 0.015 140)",
  themeRing: "oklch(0.5 0.11 155)",
  themeDestructive: "oklch(0.577 0.245 27.325)",
  themeCard: "oklch(1 0 0)",
  themeCardForeground: "oklch(0.16 0.02 145)",
  // Integrations
  cloudinaryCloudName: "",
  cloudinaryApiKey: "",
  cloudinaryApiSecret: "",
  smtpHost: "",
  smtpPort: "587",
  smtpSecure: "false",
  smtpUser: "",
  smtpPass: "",
  smtpFrom: "",
  adminNotifyEmail: "",
  // AI
  aiProvider: "openai",
  aiApiKey: "",
  aiModel: "gpt-4o-mini",
  aiBaseUrl: "",
  aiSystemPrompt: "",
  aiChatEnabled: "false",
};

export interface Feature {
  title: string;
  text: string;
  icon: string;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  logo: string;
  favicon: string;
  description: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  heroBadge: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  heroCtaPrimaryLink: string;
  heroCtaSecondaryLink: string;
  // Homepage section toggles
  showFeatures: string;
  showAbout: string;
  showVideo: string;
  showGallery: string;
  showCta: string;
  // Video section
  videoUrl: string;
  videoTitle: string;
  videoDescription: string;
  videoPoster: string;
  // About
  aboutTitle: string;
  aboutText: string;
  aboutImage: string;
  // Contact
  address: string;
  phone: string;
  email: string;
  mapQuery: string;
  hours: string;
  priceRange: string;
  rating: string;
  reviewCount: string;
  // Content
  features: Feature[];
  services: string[];
  footerNote: string;
  navbarCtaLabel: string;
  navbarCtaLink: string;
  navbarShowPhone: string;
  footerExploreTitle: string;
  footerContactTitle: string;
  footerHoursTitle: string;
  footerCopyright: string;
  // Theme colors
  themePrimary: string;
  themePrimaryForeground: string;
  themeSecondary: string;
  themeSecondaryForeground: string;
  themeAccent: string;
  themeAccentForeground: string;
  themeBackground: string;
  themeForeground: string;
  themeMuted: string;
  themeMutedForeground: string;
  themeBorder: string;
  themeRing: string;
  themeDestructive: string;
  themeCard: string;
  themeCardForeground: string;
  // AI
  aiProvider: string;
  hasAiApiKey: string;
  aiModel: string;
  aiBaseUrl: string;
  aiSystemPrompt: string;
  aiChatEnabled: string;
}

export function parseFeatures(raw: string): Feature[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Feature[];
  } catch {
    /* ignore */
  }
  return [];
}

export function parseServices(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((s) => String(s));
  } catch {
    /* ignore */
  }
  return [];
}
