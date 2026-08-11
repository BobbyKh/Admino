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
  "aiRagEnabled",
  "aiRagIndexedAt",
  // Help & FAQ
  "helpEnabled",
  "faqEnabled",
  "faqItems",
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
  siteName: "Your Business",
  tagline: "A better way to serve your customers",
  logo: "",
  favicon: "",
  description:
    "Welcome to our business. Discover our services, products, and the experience we create for every customer.",
  heroTitle: "Welcome to Your Business",
  heroSubtitle:
    "Thoughtful service, quality products, and a customer experience designed around you.",
  heroImage:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80",
  heroBadge: "Open for business",
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
  videoTitle: "See What Makes Us Special",
  videoDescription: "Take a closer look at our business and what we offer.",
  videoPoster: "",
  // About
  aboutTitle: "Built Around Your Needs",
  aboutText:
    "We are committed to dependable service, quality, and creating a welcoming experience for every customer.",
  aboutImage:
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
  address: "",
  phone: "",
  email: "hello@example.com",
  mapQuery: "",
  hours: "Contact us for opening hours",
  priceRange: "",
  rating: "",
  reviewCount: "",
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
  footerNote: "Your Business — quality service and a welcoming customer experience.",
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
  aiRagEnabled: "false",
  aiRagIndexedAt: "",
  // Help & FAQ
  helpEnabled: "true",
  faqEnabled: "true",
  faqItems: JSON.stringify([
    { question: "How can I place an order?", answer: "Browse products, add items to your cart, and check out. You'll confirm your order and payment in one flow." },
    { question: "How do I make a booking or reservation?", answer: "Use the booking form on the site, or contact us directly. You'll receive confirmation by email or phone." },
    { question: "What payment methods do you accept?", answer: "Accepted methods depend on the store configuration — typically cards (Stripe) and local wallets like eSewa." },
    { question: "How do I contact support?", answer: "Use the contact form on the site, email us, or call during business hours." },
    { question: "What are your hours?", answer: "Hours are listed in the footer and on the contact page of this site." },
  ]),
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
  aiRagEnabled: string;
  aiRagIndexedAt: string;
  // Help & FAQ
  helpEnabled: string;
  faqEnabled: string;
  faqItems: string;
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
